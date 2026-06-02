#!/usr/bin/env python3
"""
glycan_server.py
Single-file Glycan Immunogenicity API (masks unknown glycowords as UNK)

Usage:
  python glycan_server.py

Endpoints:
  GET  /health
  POST /api/validate  { "sequence": "<IUPAC-condensed>" }
  POST /api/predict   { "sequence": "<IUPAC-condensed>" }
"""

import os
import json
import re
import traceback
from typing import List, Tuple, Union

import torch
import torch.nn as nn
import torch.nn.functional as F
from flask import Flask, request, jsonify
from flask_cors import CORS
from torch_geometric.data import Data, Batch
from torch_geometric.nn import MessagePassing, global_mean_pool
from torch_geometric.utils import add_self_loops

# ---------------------------
# Configuration
# ---------------------------
VOCAB_PATH = "glycoword_vocab.json"
MODEL_PATH = "Models_MPNN_immunoClassifier_final.pt"
HOST = "0.0.0.0"
PORT = 5000
DEBUG = True

EMBED_DIM = 64
HIDDEN_DIM = 64
OUTPUT_DIM = 1
DROPOUT = 0.5

# ---------------------------
# Glycan parsing utilities
# ---------------------------

def motif_find(s: str) -> List[str]:
    """
    Very simple motif splitter kept compatible with the older pipeline:
    - Splits at '(' and ')' and re-joins into glycoword chunks using '*'
    - Returns list of glycoword-strings in the intermediate '*' format.
    Note: this is intentionally the same simple heuristic you used previously.
    """
    if not s:
        return []
    b = s.split('(')
    b = [k.split(')') for k in b]
    b = [item for sublist in b for item in sublist]
    b = [k.strip('[] ') for k in b if k.strip('[] ')]
    # produce chunks similar to previous code: groups of up to 5 tokens joined by '*'
    if len(b) < 5:
        # fallback: join whatever tokens exist into one glycoword
        return ['*'.join(b)] if b else []
    return ['*'.join(b[i:i+5]) for i in range(0, len(b) - 4, 2)]

def process_glycans(glycan_list: List[str]) -> List[str]:
    """
    Convert IUPAC strings -> list of canonical glycoword strings.
    Normalization rule: tokens inside a glycoword are joined with '|' to produce a stable key.
    Returns a list of glycoword keys like "Gal|b1-4|GlcNAc".
    """
    out = []
    for g in glycan_list:
        raw = motif_find(g)
        # raw contains strings like "Gal*b1-4*GlcNAc" or similar
        for item in raw:
            parts = [p.strip() for p in item.split('*') if p.strip()]
            if not parts:
                continue
            # normalize: join with '|' for stable lookup
            key = '|'.join(parts)
            out.append(key)
    return out

# ---------------------------
# Vocab loading & normalization
# ---------------------------

def normalize_vocab_entry(e: Union[str, list]) -> str:
    """
    Convert a vocab entry to a canonical string key.
    If the vocab file stores glycowords as list of tokens -> join with '|'.
    If it stores strings -> return stripped string.
    """
    if isinstance(e, list):
        parts = [str(p).strip() for p in e if str(p).strip()]
        return '|'.join(parts)
    elif isinstance(e, str):
        return e.strip()
    else:
        return str(e).strip()

def load_vocab(path: str) -> List[str]:
    """
    Loads glycoword_vocab.json and returns a list of canonical keys.
    Accepts either:
      - A list (where each item may be a list of tokens or a string)
      - A dict mapping token -> index (will be converted to ordered list by index)
    Ensures "UNK" exists in-memory (not saved back to file).
    """
    if not os.path.exists(path):
        raise FileNotFoundError(f"Vocabulary file not found: {path}")

    with open(path, "r") as f:
        raw = json.load(f)

    vocab_list: List[str] = []
    if isinstance(raw, dict):
        # convert token->index dict to sorted list by index
        try:
            items = sorted(raw.items(), key=lambda kv: kv[1])
            vocab_list = [normalize_vocab_entry(k) for k, _ in items]
        except Exception:
            vocab_list = [normalize_vocab_entry(k) for k in raw.keys()]
    elif isinstance(raw, list):
        vocab_list = [normalize_vocab_entry(e) for e in raw]
    else:
        raise ValueError("Unsupported glycoword_vocab.json format (list or dict expected).")

    # remove empties and deduplicate while preserving order
    seen = set()
    cleaned = []
    for tok in vocab_list:
        if not tok:
            continue
        if tok in seen:
            continue
        seen.add(tok)
        cleaned.append(tok)

    # ensure UNK token exists in memory (not writing back to file)
    if "UNK" not in cleaned:
        print("[INFO] Adding 'UNK' token to VOCAB in memory (file unchanged).")
        cleaned.append("UNK")

    return cleaned

# ---------------------------
# Safe UNK masking
# ---------------------------

def string_to_labels(glycoword_list: List[str], vocab_list: List[str]) -> Tuple[List[int], List[str]]:
    """
    Map glycoword canonical keys (like "Gal|b1-4|GlcNAc") to indices in vocab_list.
    Unknown glycowords are mapped to UNK index and returned in 'unknowns'.
    """
    if "UNK" not in vocab_list:
        raise ValueError("Vocabulary must contain 'UNK' token in memory.")
    unk_idx = vocab_list.index("UNK")
    vocab_set = set(vocab_list)

    labels = []
    unknowns = []
    for w in glycoword_list:
        if w in vocab_set:
            labels.append(vocab_list.index(w))
        else:
            labels.append(unk_idx)
            unknowns.append(w)
            # log for later vocab expansion
            print(f"[WARN] Unknown glycoword → masked as UNK: {w}")
    return labels, unknowns

# ---------------------------
# Graph construction
# ---------------------------

def sequence_to_graph(seq_tokens: List[int], label: int = 0) -> Data:
    if not seq_tokens:
        return None
    x = torch.tensor(seq_tokens, dtype=torch.long).view(-1, 1)
    edges = []
    for i in range(len(seq_tokens) - 1):
        edges.append([i, i + 1])
        edges.append([i + 1, i])
    if edges:
        edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    else:
        edge_index = torch.empty((2, 0), dtype=torch.long)
    y = torch.tensor([label], dtype=torch.float)
    return Data(x=x, edge_index=edge_index, y=y)

# ---------------------------
# Motif detection (simple rules)
# ---------------------------

def detect_known_motifs(sequence: str) -> List[str]:
    motifs = {
        "Gal(a1-3)Gal": "AlphaGal",
        "Neu5Gc": "NonHumanSialicAcid",
        "Man(b1-4)GlcNAc(b1-4)": "ComplexNGlycan",
        "NeuNAc": "HumanSialicAcid"
    }
    return [name for pattern, name in motifs.items() if pattern in sequence]

# ---------------------------
# GNN model (MPNN)
# ---------------------------

class MPNNLayer(MessagePassing):
    def __init__(self, in_dim, out_dim):
        super(MPNNLayer, self).__init__(aggr="add")
        self.lin = nn.Linear(in_dim, out_dim)

    def forward(self, x, edge_index):
        edge_index, _ = add_self_loops(edge_index, num_nodes=x.size(0))
        return self.propagate(edge_index, x=x)

    def message(self, x_j):
        return x_j

    def update(self, aggr_out):
        return self.lin(aggr_out)

class MPNNClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim=EMBED_DIM, hidden_dim=HIDDEN_DIM, output_dim=OUTPUT_DIM, dropout=DROPOUT):
        super(MPNNClassifier, self).__init__()
        if vocab_size <= 0:
            raise ValueError("vocab_size must be > 0")
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.mpnn1 = MPNNLayer(embed_dim, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.mpnn2 = MPNNLayer(hidden_dim, hidden_dim)
        self.bn2 = nn.BatchNorm1d(hidden_dim)
        self.lin1 = nn.Linear(hidden_dim, hidden_dim // 2)
        self.dropout = nn.Dropout(dropout)
        self.lin2 = nn.Linear(hidden_dim // 2, output_dim)

    def forward(self, x, edge_index, batch):
        x = self.embedding(x.squeeze(1))
        x = F.relu(self.bn1(self.mpnn1(x, edge_index)))
        x = F.relu(self.bn2(self.mpnn2(x, edge_index)))
        x = global_mean_pool(x, batch)
        x = F.relu(self.lin1(x))
        x = self.dropout(x)
        x = self.lin2(x)
        return x

# ---------------------------
# Load vocab and model
# ---------------------------

try:
    VOCAB = load_vocab(VOCAB_PATH)
except Exception as e:
    print(f"[FATAL] Failed to load vocabulary: {e}")
    raise SystemExit(1)

VOCAB_SET = set(VOCAB)
UNK_INDEX = VOCAB.index("UNK")
VOCAB_SIZE = len(VOCAB)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[INFO] Device: {device}, vocab_size={VOCAB_SIZE}, UNK_INDEX={UNK_INDEX}")

model = MPNNClassifier(vocab_size=VOCAB_SIZE, embed_dim=EMBED_DIM, hidden_dim=HIDDEN_DIM, output_dim=OUTPUT_DIM, dropout=DROPOUT)
model = model.to(device)

if os.path.exists(MODEL_PATH):
    try:
        state = torch.load(MODEL_PATH, map_location=device)
        model.load_state_dict(state)
        model.eval()
        print(f"[INFO] Loaded model from {MODEL_PATH}")
    except Exception as e:
        print(f"[WARN] Failed loading model: {e}")
        print("[WARN] Running with random weights (OK for UI/testing).")
else:
    print(f"[WARN] Model checkpoint not found at {MODEL_PATH}. Running with random weights (OK for UI/testing).")

# ---------------------------
# Flask app
# ---------------------------

app = Flask(__name__)
CORS(app)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "vocab_size": VOCAB_SIZE,
        "model_loaded": os.path.exists(MODEL_PATH)
    }), 200

@app.route("/api/validate", methods=["POST"])
def validate_sequence():
    """
    NEVER rejects input because of unknown glycowords.
    Returns info about glycowords and unknowns (informational only).
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        sequence = (data.get("sequence") or "").strip()
        if not sequence:
            return jsonify({"valid": False, "reason": "Sequence is empty."}), 400

        glycowords = process_glycans([sequence])
        if not glycowords:
            return jsonify({"valid": False, "reason": "Too short or invalid glycan structure."}), 400

        # glycowords are canonical strings (e.g. "Gal|b1-4|GlcNAc")
        labels, unknowns = string_to_labels(glycowords, VOCAB)

        return jsonify({
            "valid": True,
            "glycowords_count": len(glycowords),
            "unknown_count": len(unknowns),
            "unknown_glycowords": unknowns,
            "note": "Unknown glycowords were masked as UNK (informational)."
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"valid": False, "reason": "Internal server error."}), 500

@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Mask unknown glycowords with UNK and run prediction.
    """
    try:
        data = request.get_json(force=True, silent=True) or {}
        sequence = (data.get("sequence") or "").strip()
        if not sequence:
            return jsonify({"error": "No sequence provided"}), 400

        glycowords = process_glycans([sequence])
        if not glycowords:
            return jsonify({"error": "Invalid glycan structure or too short to analyze."}), 400

        labels, unknowns = string_to_labels(glycowords, VOCAB)
        # ensure ints
        tokens = [int(x) for x in labels]

        graph = sequence_to_graph(tokens)
        if graph is None:
            return jsonify({"error": "Could not create graph from sequence."}), 400

        batch = Batch.from_data_list([graph]).to(device)
        with torch.no_grad():
            logits = model(batch.x, batch.edge_index, batch.batch)
            score = float(torch.sigmoid(logits).cpu().item())

        label = "Immunogenic" if score >= 0.5 else "Non-Immunogenic"
        motifs = detect_known_motifs(sequence)

        return jsonify({
            "prediction": label,
            "score": score,
            "glycowords_count": len(glycowords),
            "unknown_count": len(unknowns),
            "unknown_glycowords": unknowns,
            "motifs_detected": motifs,
            "note": "Unknown glycowords were masked as UNK and prediction proceeded."
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500

# ---------------------------
# Run
# ---------------------------
if __name__ == "__main__":
    print("🔥 Glycan Immunogenicity API (single-file) starting...")
    print("Vocab loaded from file (parsed).") 
    # mention the source file reference for traceability
    print("Source vocab file: {}".format(VOCAB_PATH))
    app.run(host=HOST, port=PORT, debug=DEBUG)
