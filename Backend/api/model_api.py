import os
import json
import re
from typing import List, Dict, Tuple
from collections import Counter

import torch
import torch.nn as nn
import torch.nn.functional as F

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from torch_geometric.data import Data, Batch
from torch_geometric.nn import MessagePassing, global_mean_pool, GINConv, GATConv
from torch_geometric.utils import add_self_loops

# ============================ Load Model & Vocab ============================

try:
    with open('Backend/vocab/glycoword_vocab.json', 'r') as f:
        VOCAB = json.load(f)
except FileNotFoundError:
    # Try alternative path for when running from Backend directory
    try:
        with open('vocab/glycoword_vocab.json', 'r') as f:
            VOCAB = json.load(f)
    except FileNotFoundError:
        print("FATAL ERROR: glycoword_vocab.json not found.")
        raise SystemExit(1)

UNK_INDEX = len(VOCAB)
VOCAB_SIZE = len(VOCAB) + 1

VOCAB_TUPLES = {tuple(w) for w in VOCAB}

SUGAR_SET = set()
BOND_SET = set()

for w in VOCAB:
    if isinstance(w, list) and len(w) == 5:
        s1, b1, s2, b2, s3 = w
        SUGAR_SET.update([s1, s2, s3])
        BOND_SET.update([b1, b2])


def mask_token(tok: str) -> str:
    if not tok:
        return tok
    if tok in ("UNK", "UNK_SUG"):
        return "UNK_SUG"
    if tok == "UNK_BOND":
        return "UNK_BOND"
    if re.match(r'^[ab]\d+-\d+$', tok):
        return tok if tok in BOND_SET else "UNK_BOND"
    return tok if tok in SUGAR_SET else "UNK_SUG"


def preprocess_glycan_sequence(sequence: str) -> str:
    pattern = re.compile(
        r'(Alpha)(\d+),\d+\s*-\s*UNK\s*-\s*(beta)\d+,(\d+)',
        flags=re.IGNORECASE
    )
    def _merge_unk_bond(match: re.Match) -> str:
        anomer_left = match.group(1)
        pos1_left   = match.group(2)
        pos2_right  = match.group(4)
        return f"{anomer_left}{pos1_left},{pos2_right}"
    seq = pattern.sub(_merge_unk_bond, sequence)
    seq = re.sub(r'\s*-\s*UNK\s*-\s*', ' - ', seq)
    seq = re.sub(r'Y\s*$', '', seq)
    return seq


def tokenize_glycan_raw(s: str) -> List[str]:
    b = s.split('(')
    b = [k.split(')') for k in b]
    b = [item for sublist in b for item in sublist]
    b = [k.strip('[') for k in b]
    b = [k.strip(']') for k in b]
    b = [k.replace('[', '') for k in b]
    b = [k.replace(']', '') for k in b]
    b = [k for k in b if k]
    return b


def motif_find(s: str) -> List[str]:
    b = tokenize_glycan_raw(s)
    b = [mask_token(k) for k in b]
    b = ['*'.join(b[i:i+5]) for i in range(0, len(b) - 4, 2)]
    return b


def sequence_to_graph(seq_tokens, label: int = 0):
    if not seq_tokens:
        return None
    x = torch.tensor(seq_tokens, dtype=torch.long).view(-1, 1)
    edge_indices = [[i, i + 1] for i in range(len(seq_tokens) - 1)]
    edge_indices += [[i + 1, i] for i in range(len(seq_tokens) - 1)]
    if edge_indices:
        edge_index = torch.tensor(edge_indices, dtype=torch.long).t().contiguous()
    else:
        edge_index = torch.empty((2, 0), dtype=torch.long)
    y = torch.tensor([label], dtype=torch.float)
    return Data(x=x, edge_index=edge_index, y=y)


def detect_known_motifs(sequence: str):
    motifs = {
        "Gal(a1-3)Gal": "AlphaGal",
        "Neu5Gc": "NonHumanSialicAcid",
        "Man(b1-4)GlcNAc(b1-4)": "ComplexNGlycan"
    }
    detected = [name for pattern, name in motifs.items() if pattern in sequence]
    return detected


def character_to_label(character, libr):
    try:
        return libr.index(character)
    except ValueError:
        return UNK_INDEX


def string_to_labels(glycoword_list, libr):
    return [character_to_label(word, libr) for word in glycoword_list]


def analyze_glycan(sequence: str):
    raw_tokens = tokenize_glycan_raw(sequence)
    unknown_sugars = Counter()
    unknown_bonds = Counter()
    masked_tokens = []
    
    for tok in raw_tokens:
        masked = mask_token(tok)
        masked_tokens.append(masked)
        if masked == "UNK_SUG":
            unknown_sugars[tok] += 1
        elif masked == "UNK_BOND":
            unknown_bonds[tok] += 1
    
    glycowords = []
    for i in range(0, len(masked_tokens) - 4, 2):
        gw = masked_tokens[i:i+5]
        glycowords.append(gw)
    
    unknown_glycowords = Counter()
    for gw in glycowords:
        gw_tuple = tuple(gw)
        contains_unk = any(t in ("UNK_SUG", "UNK_BOND") for t in gw)
        if contains_unk or gw_tuple not in VOCAB_TUPLES:
            gw_str = "*".join(gw)
            unknown_glycowords[gw_str] += 1
    
    return glycowords, dict(unknown_sugars), dict(unknown_bonds), dict(unknown_glycowords)


# =========================== Model Definitions ===============================

class MPNNLayer(MessagePassing):
    def __init__(self, in_dim, out_dim):
        super(MPNNLayer, self).__init__(aggr='add')
        self.lin = nn.Linear(in_dim, out_dim)

    def forward(self, x, edge_index):
        edge_index, _ = add_self_loops(edge_index, num_nodes=x.size(0))
        return self.propagate(edge_index, x=x)

    def message(self, x_j):
        return x_j

    def update(self, aggr_out):
        return self.lin(aggr_out)


class MPNNClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, output_dim, dropout=0.5):
        super(MPNNClassifier, self).__init__()
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


class GINClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, output_dim, dropout=0.5):
        super(GINClassifier, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        nn1 = nn.Sequential(nn.Linear(embed_dim, hidden_dim), nn.ReLU(), nn.Linear(hidden_dim, hidden_dim))
        self.conv1 = GINConv(nn1)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        nn2 = nn.Sequential(nn.Linear(hidden_dim, hidden_dim), nn.ReLU(), nn.Linear(hidden_dim, hidden_dim))
        self.conv2 = GINConv(nn2)
        self.bn2 = nn.BatchNorm1d(hidden_dim)
        self.lin1 = nn.Linear(hidden_dim, hidden_dim // 2)
        self.dropout = nn.Dropout(dropout)
        self.lin2 = nn.Linear(hidden_dim // 2, output_dim)

    def forward(self, x, edge_index, batch):
        x = self.embedding(x.squeeze(1))
        x = F.relu(self.bn1(self.conv1(x, edge_index)))
        x = F.relu(self.bn2(self.conv2(x, edge_index)))
        x = global_mean_pool(x, batch)
        x = F.relu(self.lin1(x))
        x = self.dropout(x)
        x = self.lin2(x)
        return x


class GATClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, output_dim, dropout=0.5, heads=4):
        super(GATClassifier, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.conv1 = GATConv(embed_dim, hidden_dim // heads, heads=heads, dropout=dropout)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.conv2 = GATConv(hidden_dim, hidden_dim // heads, heads=heads, dropout=dropout)
        self.bn2 = nn.BatchNorm1d(hidden_dim)
        self.lin1 = nn.Linear(hidden_dim, hidden_dim // 2)
        self.dropout = nn.Dropout(dropout)
        self.lin2 = nn.Linear(hidden_dim // 2, output_dim)

    def forward(self, x, edge_index, batch):
        x = self.embedding(x.squeeze(1))
        x = F.relu(self.bn1(self.conv1(x, edge_index)))
        x = F.relu(self.bn2(self.conv2(x, edge_index)))
        x = global_mean_pool(x, batch)
        x = F.relu(self.lin1(x))
        x = self.dropout(x)
        x = self.lin2(x)
        return x


class LSTMClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, output_dim, dropout=0.5, num_layers=2):
        super(LSTMClassifier, self).__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, num_layers=num_layers, 
                           batch_first=True, dropout=dropout if num_layers > 1 else 0)
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim, output_dim)

    def forward(self, x, edge_index, batch):
        x = self.embedding(x.squeeze(1))
        batch_size = batch.max().item() + 1
        seq_list = []
        for i in range(batch_size):
            mask = (batch == i)
            seq = x[mask]
            seq_list.append(seq)
        
        padded_seq = nn.utils.rnn.pad_sequence(seq_list, batch_first=True)
        _, (hidden, _) = self.lstm(padded_seq)
        out = hidden[-1]
        out = self.dropout(out)
        out = self.fc(out)
        return out


# =========================== Load All Models =================================

EMBED_DIM = 64
HIDDEN_DIM = 64
OUTPUT_DIM = 1
DROPOUT = 0.5

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# Add safe globals for PyTorch 2.6 compatibility
import sys
current_module = sys.modules[__name__]
torch.serialization.add_safe_globals([
    getattr(current_module, 'MPNNClassifier'),
    getattr(current_module, 'GINClassifier'), 
    getattr(current_module, 'GATClassifier'),
    getattr(current_module, 'LSTMClassifier')
])

# MPNN Model Configuration
MPNN_MODEL_PATH = 'Backend/models/Models_MPNN_immunoClassifier_final.pt'

# Try alternative path for when running from Backend directory
if not os.path.exists(MPNN_MODEL_PATH):
    MPNN_MODEL_PATH = 'models/Models_MPNN_immunoClassifier_final.pt'

# Load MPNN Model
mpnn_model = None

try:
    mpnn_model = MPNNClassifier(
        vocab_size=VOCAB_SIZE,
        embed_dim=EMBED_DIM,
        hidden_dim=HIDDEN_DIM,
        output_dim=OUTPUT_DIM,
        dropout=DROPOUT
    )
    
    # Use weights_only=False for trusted model files
    state_dict = torch.load(MPNN_MODEL_PATH, map_location=device, weights_only=False)
    mpnn_model.load_state_dict(state_dict)
    mpnn_model.to(device)
    mpnn_model.eval()
    
    # Initialize unknown token embedding with mean of known embeddings
    with torch.no_grad():
        if UNK_INDEX > 0:
            known_indices = torch.arange(0, UNK_INDEX, device=device)
            mean_vec = mpnn_model.embedding.weight[known_indices].mean(dim=0)
            mpnn_model.embedding.weight[UNK_INDEX] = mean_vec
    
    print("MPNN model loaded successfully.")
    
except FileNotFoundError:
    print(f"FATAL ERROR: MPNN model file not found at {MPNN_MODEL_PATH}")
    raise SystemExit(1)
except Exception as e:
    print(f"FATAL ERROR: Error loading MPNN model: {e}")
    raise SystemExit(1)


def mpnn_predict(batch: Batch) -> float:
    """
    Perform prediction using MPNN model.
    Returns: prediction_score
    """
    # Ensure batch is on the correct device
    batch = batch.to(device)
    
    with torch.no_grad():
        output_logits = mpnn_model(batch.x, batch.edge_index, batch.batch)
        score = torch.sigmoid(output_logits).item()
    
    return score


# =========================== Pydantic Models =============================

class SequenceRequest(BaseModel):
    sequence: str

class ValidationResponse(BaseModel):
    valid: bool
    reason: str = None
    unknown_sugars: dict = None
    unknown_bonds: dict = None
    unknown_glycowords: dict = None

class PredictionResponse(BaseModel):
    prediction: str
    score: float
    motifs_detected: list
    processed_sequence: str
    unknown_sugars: dict
    unknown_bonds: dict
    unknown_glycowords: dict

# =========================== FastAPI Router Definition ====================

model_api = APIRouter()


@model_api.post('/api/validate', response_model=ValidationResponse)
def validate_sequence(request: SequenceRequest):
    sequence = request.sequence

    if not sequence:
        raise HTTPException(status_code=400, detail="Sequence is empty.")

    sequence_processed = preprocess_glycan_sequence(sequence)

    try:
        glycowords, unknown_sugars, unknown_bonds, unknown_glycowords = analyze_glycan(sequence_processed)

        if not glycowords:
            return ValidationResponse(
                valid=False,
                reason="Too short or invalid glycan structure."
            )

        _ = string_to_labels(glycowords, VOCAB)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ValidationResponse(
        valid=True,
        unknown_sugars=unknown_sugars,
        unknown_bonds=unknown_bonds,
        unknown_glycowords=unknown_glycowords
    )


@model_api.post('/api/predict', response_model=PredictionResponse)
def predict(request: SequenceRequest):
    sequence = request.sequence

    if not sequence:
        raise HTTPException(status_code=400, detail="No sequence provided")

    sequence_processed = preprocess_glycan_sequence(sequence)

    try:
        glycowords, unknown_sugars, unknown_bonds, unknown_glycowords = analyze_glycan(sequence_processed)

        if not glycowords:
            raise HTTPException(
                status_code=400,
                detail="Invalid glycan structure or too short to analyze."
            )

        tokens = string_to_labels(glycowords, VOCAB)
        graph = sequence_to_graph(tokens)
        if graph is None:
            raise HTTPException(
                status_code=400,
                detail="Could not create a graph from the sequence."
            )

        batch = Batch.from_data_list([graph]).to(device)

        # Use MPNN model for prediction
        prediction_score = mpnn_predict(batch)

        prediction_label = "Immunogenic" if prediction_score >= 0.5 else "Non-Immunogenic"
        motifs = detect_known_motifs(sequence_processed)

        return PredictionResponse(
            prediction=prediction_label,
            score=prediction_score,
            motifs_detected=motifs,
            processed_sequence=sequence_processed,
            unknown_sugars=unknown_sugars,
            unknown_bonds=unknown_bonds,
            unknown_glycowords=unknown_glycowords
        )

    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred.")