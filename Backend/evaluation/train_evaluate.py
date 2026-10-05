"""
train_evaluate.py
=================
Trains all four GNN/RNN classifiers (MPNN, GIN, GAT, LSTM) on the training
split of merged_glycan_dataset_clean.csv, evaluates each on the held-out test
split, and writes results to:

  Backend/evaluation/results/overall_metrics.csv
  Backend/evaluation/results/per_model_predictions.csv
  Backend/evaluation/results/training_log.csv

The split is the 'split' column written by make_split.py
(80/20 stratified, random_state=42).

Usage (from repo root):
    python Backend/evaluation/train_evaluate.py

Requirements: torch, torch-geometric, scikit-learn, pandas
"""

import os, sys, json, re, ast, pathlib, time
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.optim import Adam
from torch_geometric.data import Data, Batch
from torch_geometric.nn import MessagePassing, global_mean_pool, GINConv, GATConv
from torch_geometric.utils import add_self_loops
from sklearn.metrics import (
    accuracy_score, roc_auc_score, f1_score,
    precision_score, recall_score, confusion_matrix,
    matthews_corrcoef,
)

# ── paths ──────────────────────────────────────────────────────────────────
ROOT    = pathlib.Path(__file__).parent.parent.parent   # repo root
DATASET = ROOT / "Backend/dataset/merged_glycan_dataset_clean.csv"
VOCAB_F = ROOT / "Backend/vocab/glycoword_vocab.json"
OUT_DIR = ROOT / "Backend/evaluation/results"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ── hyperparameters ─────────────────────────────────────────────────────────
EMBED_DIM  = 64
HIDDEN_DIM = 64
OUTPUT_DIM = 1
DROPOUT    = 0.5
EPOCHS     = 60
LR         = 1e-3
BATCH_SIZE = 32
THRESHOLD  = 0.5
SEED       = 42

torch.manual_seed(SEED)
np.random.seed(SEED)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {device}")

# ── vocabulary ──────────────────────────────────────────────────────────────
with open(VOCAB_F) as f:
    VOCAB = json.load(f)

UNK_INDEX  = len(VOCAB)
VOCAB_SIZE = len(VOCAB) + 1

SUGAR_SET = set()
BOND_SET  = set()
for w in VOCAB:
    if isinstance(w, list) and len(w) == 5:
        s1, b1, s2, b2, s3 = w
        SUGAR_SET.update([s1, s2, s3])
        BOND_SET.update([b1, b2])


def mask_token(tok: str) -> str:
    if not tok: return tok
    if tok in ("UNK", "UNK_SUG"): return "UNK_SUG"
    if tok == "UNK_BOND": return "UNK_BOND"
    if re.match(r'^[ab]\d+-\d+$', tok):
        return tok if tok in BOND_SET else "UNK_BOND"
    return tok if tok in SUGAR_SET else "UNK_SUG"


def tokenize(s: str):
    b = s.split('(')
    b = [k.split(')') for k in b]
    b = [item for sublist in b for item in sublist]
    b = [k.strip('[').strip(']').replace('[','').replace(']','') for k in b]
    return [k for k in b if k]


def glycan_to_graph(sequence: str, label: int) -> Data | None:
    raw  = tokenize(sequence)
    masked = [mask_token(t) for t in raw]
    # glycoword index lookup
    def char_to_idx(gw_list):
        try:
            return VOCAB.index(gw_list)
        except ValueError:
            return UNK_INDEX

    glycowords = [masked[i:i+5] for i in range(0, len(masked) - 4, 2)]
    if not glycowords:
        return None

    indices = [char_to_idx(gw) for gw in glycowords]
    x = torch.tensor(indices, dtype=torch.long).view(-1, 1)

    n = len(indices)
    src = list(range(n - 1)) + list(range(1, n))
    dst = list(range(1, n)) + list(range(n - 1))
    edge_index = (torch.tensor([src, dst], dtype=torch.long)
                  if n > 1 else torch.empty((2, 0), dtype=torch.long))

    y = torch.tensor([label], dtype=torch.float)
    return Data(x=x, edge_index=edge_index, y=y)


def build_dataset(df: pd.DataFrame):
    graphs, skipped = [], 0
    for _, row in df.iterrows():
        g = glycan_to_graph(str(row['glycan']), int(float(row['label'])))
        if g is None:
            skipped += 1
        else:
            graphs.append(g)
    if skipped:
        print(f"  [warn] skipped {skipped} sequences (too short to form a glycoword)")
    return graphs


def make_batches(graphs, batch_size=BATCH_SIZE, shuffle=False):
    if shuffle:
        idx = torch.randperm(len(graphs)).tolist()
        graphs = [graphs[i] for i in idx]
    return [Batch.from_data_list(graphs[i:i+batch_size])
            for i in range(0, len(graphs), batch_size)]


# ── model definitions ────────────────────────────────────────────────────────

class MPNNLayer(MessagePassing):
    def __init__(self, in_dim, out_dim):
        super().__init__(aggr='add')
        self.lin = nn.Linear(in_dim, out_dim)
    def forward(self, x, edge_index):
        edge_index, _ = add_self_loops(edge_index, num_nodes=x.size(0))
        return self.propagate(edge_index, x=x)
    def message(self, x_j): return x_j
    def update(self, aggr_out): return self.lin(aggr_out)


class MPNNClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, output_dim, dropout=0.5):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.mpnn1  = MPNNLayer(embed_dim, hidden_dim)
        self.bn1    = nn.BatchNorm1d(hidden_dim)
        self.mpnn2  = MPNNLayer(hidden_dim, hidden_dim)
        self.bn2    = nn.BatchNorm1d(hidden_dim)
        self.lin1   = nn.Linear(hidden_dim, hidden_dim // 2)
        self.dropout = nn.Dropout(dropout)
        self.lin2   = nn.Linear(hidden_dim // 2, output_dim)

    def forward(self, x, edge_index, batch):
        x = self.embedding(x.squeeze(1))
        x = F.relu(self.bn1(self.mpnn1(x, edge_index)))
        x = F.relu(self.bn2(self.mpnn2(x, edge_index)))
        x = global_mean_pool(x, batch)
        x = F.relu(self.lin1(x))
        x = self.dropout(x)
        return self.lin2(x)


class GINClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, output_dim, dropout=0.5):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        nn1 = nn.Sequential(nn.Linear(embed_dim, hidden_dim), nn.ReLU(), nn.Linear(hidden_dim, hidden_dim))
        self.conv1  = GINConv(nn1)
        self.bn1    = nn.BatchNorm1d(hidden_dim)
        nn2 = nn.Sequential(nn.Linear(hidden_dim, hidden_dim), nn.ReLU(), nn.Linear(hidden_dim, hidden_dim))
        self.conv2  = GINConv(nn2)
        self.bn2    = nn.BatchNorm1d(hidden_dim)
        self.lin1   = nn.Linear(hidden_dim, hidden_dim // 2)
        self.dropout = nn.Dropout(dropout)
        self.lin2   = nn.Linear(hidden_dim // 2, output_dim)

    def forward(self, x, edge_index, batch):
        x = self.embedding(x.squeeze(1))
        x = F.relu(self.bn1(self.conv1(x, edge_index)))
        x = F.relu(self.bn2(self.conv2(x, edge_index)))
        x = global_mean_pool(x, batch)
        x = F.relu(self.lin1(x))
        x = self.dropout(x)
        return self.lin2(x)


class GATClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, output_dim, dropout=0.5, heads=4):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.conv1  = GATConv(embed_dim, hidden_dim // heads, heads=heads, dropout=dropout)
        self.bn1    = nn.BatchNorm1d(hidden_dim)
        self.conv2  = GATConv(hidden_dim, hidden_dim // heads, heads=heads, dropout=dropout)
        self.bn2    = nn.BatchNorm1d(hidden_dim)
        self.lin1   = nn.Linear(hidden_dim, hidden_dim // 2)
        self.dropout = nn.Dropout(dropout)
        self.lin2   = nn.Linear(hidden_dim // 2, output_dim)

    def forward(self, x, edge_index, batch):
        x = self.embedding(x.squeeze(1))
        x = F.relu(self.bn1(self.conv1(x, edge_index)))
        x = F.relu(self.bn2(self.conv2(x, edge_index)))
        x = global_mean_pool(x, batch)
        x = F.relu(self.lin1(x))
        x = self.dropout(x)
        return self.lin2(x)


class LSTMClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, output_dim, dropout=0.5, num_layers=2):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, num_layers=num_layers,
                            batch_first=True,
                            dropout=dropout if num_layers > 1 else 0)
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim, output_dim)

    def forward(self, x, edge_index, batch):
        x = self.embedding(x.squeeze(1))
        batch_size = int(batch.max().item()) + 1
        seq_list = [x[batch == i] for i in range(batch_size)]
        padded = nn.utils.rnn.pad_sequence(seq_list, batch_first=True)
        _, (hidden, _) = self.lstm(padded)
        out = self.dropout(hidden[-1])
        return self.fc(out)


MODEL_CONFIGS = {
    "MPNN": MPNNClassifier,
    "GIN":  GINClassifier,
    "GAT":  GATClassifier,
    "LSTM": LSTMClassifier,
}


# ── training & evaluation ────────────────────────────────────────────────────

def train_epoch(model, batches, optimizer, criterion):
    model.train()
    total_loss = 0.0
    for batch in batches:
        batch = batch.to(device)
        optimizer.zero_grad()
        logits = model(batch.x, batch.edge_index, batch.batch).squeeze(1)
        loss = criterion(logits, batch.y)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * batch.num_graphs
    return total_loss / sum(b.num_graphs for b in batches)


@torch.no_grad()
def evaluate(model, batches):
    model.eval()
    all_logits, all_labels = [], []
    for batch in batches:
        batch = batch.to(device)
        logits = model(batch.x, batch.edge_index, batch.batch).squeeze(1)
        all_logits.append(logits.cpu())
        all_labels.append(batch.y.cpu())
    logits = torch.cat(all_logits).numpy()
    labels = torch.cat(all_labels).numpy().astype(int)
    probs  = 1 / (1 + np.exp(-logits))          # sigmoid
    preds  = (probs >= THRESHOLD).astype(int)
    return probs, preds, labels


def compute_metrics(probs, preds, labels) -> dict:
    tn, fp, fn, tp = confusion_matrix(labels, preds, labels=[0, 1]).ravel()
    return {
        "accuracy":    round(accuracy_score(labels, preds), 4),
        "roc_auc":     round(roc_auc_score(labels, probs), 4),
        "f1":          round(f1_score(labels, preds, zero_division=0), 4),
        "precision":   round(precision_score(labels, preds, zero_division=0), 4),
        "recall":      round(recall_score(labels, preds, zero_division=0), 4),
        "mcc":         round(matthews_corrcoef(labels, preds), 4),
        "specificity": round(tn / (tn + fp) if (tn + fp) > 0 else 0.0, 4),
        "tp": int(tp), "tn": int(tn), "fp": int(fp), "fn": int(fn),
    }


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    print(f"\nLoading dataset: {DATASET}")
    df = pd.read_csv(DATASET)
    df['label'] = df['label'].astype(float)

    if 'split' not in df.columns or df['split'].isna().all():
        raise RuntimeError(
            "'split' column missing. Run Backend/dataset/make_split.py first."
        )

    df_train = df[df['split'] == 'train'].reset_index(drop=True)
    df_test  = df[df['split'] == 'test'].reset_index(drop=True)

    print(f"Train: {len(df_train)} (pos={int((df_train['label']==1).sum())}, neg={int((df_train['label']==0).sum())})")
    print(f"Test : {len(df_test)}  (pos={int((df_test['label']==1).sum())},  neg={int((df_test['label']==0).sum())})")

    print("\nBuilding graph datasets …")
    train_graphs = build_dataset(df_train)
    test_graphs  = build_dataset(df_test)

    # Save test-set glycan strings so per-pathogen script can join on them
    test_glycans = [g.glycan if hasattr(g, 'glycan') else None for g in test_graphs]

    criterion = nn.BCEWithLogitsLoss()

    all_metrics  = []
    train_log    = []
    all_test_preds = {"glycan": df_test['glycan'].tolist()}

    for model_name, ModelClass in MODEL_CONFIGS.items():
        print(f"\n{'='*55}")
        print(f"  Training {model_name}  ({EPOCHS} epochs, lr={LR})")
        print(f"{'='*55}")

        model = ModelClass(
            vocab_size=VOCAB_SIZE,
            embed_dim=EMBED_DIM,
            hidden_dim=HIDDEN_DIM,
            output_dim=OUTPUT_DIM,
            dropout=DROPOUT,
        ).to(device)

        optimizer = Adam(model.parameters(), lr=LR)

        t0 = time.time()
        for epoch in range(1, EPOCHS + 1):
            tr_batches   = make_batches(train_graphs, shuffle=True)
            loss         = train_epoch(model, tr_batches, optimizer, criterion)

            if epoch % 10 == 0 or epoch == 1:
                te_batches = make_batches(test_graphs, shuffle=False)
                probs, preds, labels = evaluate(model, te_batches)
                m = compute_metrics(probs, preds, labels)
                elapsed = time.time() - t0
                print(f"  Epoch {epoch:3d}/{EPOCHS}  loss={loss:.4f}  "
                      f"acc={m['accuracy']:.4f}  auc={m['roc_auc']:.4f}  "
                      f"f1={m['f1']:.4f}  [{elapsed:.1f}s]")
                train_log.append({"model": model_name, "epoch": epoch,
                                   "train_loss": round(loss, 6), **m})

        # Final evaluation on test set
        te_batches = make_batches(test_graphs, shuffle=False)
        probs, preds, labels = evaluate(model, te_batches)
        m = compute_metrics(probs, preds, labels)

        print(f"\n  ── Final test metrics ({model_name}) ──")
        for k, v in m.items():
            print(f"    {k:12s}: {v}")

        m['model']       = model_name
        m['train_size']  = len(train_graphs)
        m['test_size']   = len(test_graphs)
        m['epochs']      = EPOCHS
        m['lr']          = LR
        all_metrics.append(m)

        # Store per-sample predictions for downstream analysis
        all_test_preds[f"{model_name}_prob"]  = probs.tolist()
        all_test_preds[f"{model_name}_pred"]  = preds.tolist()

        # Save model weights
        save_path = ROOT / f"Backend/models/{model_name}_retrained.pt"
        torch.save(model.state_dict(), save_path)
        print(f"  Saved weights → {save_path}")

    # ── write outputs ────────────────────────────────────────────────────────
    # Store true labels with predictions
    all_test_preds["true_label"] = labels.tolist()

    pred_df = pd.DataFrame(all_test_preds)
    # Join back species/family for per-pathogen script
    meta_cols = ['glycan', 'species', 'Genus', 'Family', 'Phylum',
                 'Kingdom', 'Domain', 'inferred_origin', 'label', 'split']
    meta_cols = [c for c in meta_cols if c in df_test.columns]
    pred_df = pred_df.merge(df_test[meta_cols], on='glycan', how='left')

    metrics_df = pd.DataFrame(all_metrics)
    # Reorder columns
    front = ['model', 'accuracy', 'roc_auc', 'f1', 'precision',
             'recall', 'specificity', 'mcc', 'tp', 'tn', 'fp', 'fn',
             'train_size', 'test_size', 'epochs', 'lr']
    metrics_df = metrics_df[[c for c in front if c in metrics_df.columns]]

    log_df = pd.DataFrame(train_log)

    metrics_df.to_csv(OUT_DIR / "overall_metrics.csv", index=False)
    pred_df.to_csv(OUT_DIR / "per_model_predictions.csv", index=False)
    log_df.to_csv(OUT_DIR / "training_log.csv", index=False)

    print(f"\n{'='*55}")
    print("Results written to Backend/evaluation/results/")
    print(f"  overall_metrics.csv       — {len(metrics_df)} models")
    print(f"  per_model_predictions.csv — {len(pred_df)} test samples × {len(MODEL_CONFIGS)} models")
    print(f"  training_log.csv          — {len(log_df)} epoch checkpoints")
    print(f"{'='*55}")
    print("\nSummary table:")
    print(metrics_df[['model','accuracy','roc_auc','f1','mcc']].to_string(index=False))


if __name__ == "__main__":
    main()
