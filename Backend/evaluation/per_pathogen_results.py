"""
per_pathogen_results.py
=======================
Reads per_model_predictions.csv (output of train_evaluate.py) and produces
one CSV per bacterial family and per phylum, written to:

  Backend/evaluation/results/per_pathogen/<Phylum>/<Family>/metrics.csv
  Backend/evaluation/results/per_pathogen/<Phylum>/<Family>/predictions.csv

Also writes a summary roll-up:
  Backend/evaluation/results/per_pathogen/summary_by_family.csv
  Backend/evaluation/results/per_pathogen/summary_by_phylum.csv

Only families / phyla with ≥5 test-set glycans are reported
(fewer instances give unreliable metrics).

Usage (from repo root):
    python Backend/evaluation/per_pathogen_results.py
"""

import ast, pathlib, re
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, roc_auc_score, f1_score,
    precision_score, recall_score, matthews_corrcoef,
    confusion_matrix,
)

ROOT    = pathlib.Path(__file__).parent.parent.parent
PRED_F  = ROOT / "Backend/evaluation/results/per_model_predictions.csv"
OUT_DIR = ROOT / "Backend/evaluation/results/per_pathogen"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MIN_SAMPLES = 5    # minimum test-set rows to report metrics for a group
MODELS      = ["MPNN", "GIN", "GAT", "LSTM"]


# ── helpers ──────────────────────────────────────────────────────────────────

def safe_parse_list(v) -> list:
    """Parse stringified Python list or return empty list."""
    if pd.isna(v) or str(v).strip() in ('', '[]', 'nan', 'None'):
        return []
    try:
        r = ast.literal_eval(str(v))
        return r if isinstance(r, list) else [str(r)]
    except Exception:
        return [str(v)]


def sanitise(name: str) -> str:
    """Make a string safe for use as a directory/filename."""
    return re.sub(r'[^\w\-]', '_', str(name)).strip('_') or 'unknown'


def compute_metrics(true_labels, probs, preds) -> dict:
    """Return a metric dict; returns NaN for AUC when only one class present."""
    if len(true_labels) < 2:
        return {k: float('nan') for k in
                ['accuracy','roc_auc','f1','precision','recall','mcc',
                 'specificity','tp','tn','fp','fn','n_samples']}
    try:
        auc = roc_auc_score(true_labels, probs)
    except ValueError:
        auc = float('nan')
    cm = confusion_matrix(true_labels, preds, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    return {
        "accuracy":    round(accuracy_score(true_labels, preds), 4),
        "roc_auc":     round(auc, 4) if not np.isnan(auc) else float('nan'),
        "f1":          round(f1_score(true_labels, preds, zero_division=0), 4),
        "precision":   round(precision_score(true_labels, preds, zero_division=0), 4),
        "recall":      round(recall_score(true_labels, preds, zero_division=0), 4),
        "mcc":         round(matthews_corrcoef(true_labels, preds), 4),
        "specificity": round(tn / (tn + fp) if (tn + fp) > 0 else 0.0, 4),
        "tp": int(tp), "tn": int(tn), "fp": int(fp), "fn": int(fn),
        "n_samples": len(true_labels),
    }


def expand_species_rows(df: pd.DataFrame) -> pd.DataFrame:
    """
    Each row may have multiple species (stored as a stringified list).
    Explode so each row has exactly one species with its associated
    Genus / Family / Phylum — keeping the glycan and predictions intact.
    """
    records = []
    for _, row in df.iterrows():
        species_list = safe_parse_list(row.get('species'))
        genus_list   = safe_parse_list(row.get('Genus'))
        family_list  = safe_parse_list(row.get('Family'))
        phylum_list  = safe_parse_list(row.get('Phylum'))
        domain_list  = safe_parse_list(row.get('Domain'))

        inferred = str(row.get('inferred_origin', '')) if pd.notna(row.get('inferred_origin')) else ''

        if not species_list:
            # Use inferred_origin as phylum proxy when species is absent
            records.append({**row.to_dict(),
                             'species_single': 'unknown',
                             'genus_single':   'unknown',
                             'family_single':  'unknown',
                             'phylum_single':  inferred or 'unknown',
                             'domain_single':  inferred or 'unknown'})
        else:
            for i, sp in enumerate(species_list):
                records.append({**row.to_dict(),
                                 'species_single': sp,
                                 'genus_single':   genus_list[i]  if i < len(genus_list)  else 'unknown',
                                 'family_single':  family_list[i] if i < len(family_list) else 'unknown',
                                 'phylum_single':  phylum_list[i] if i < len(phylum_list) else 'unknown',
                                 'domain_single':  domain_list[i] if i < len(domain_list) else 'unknown'})
    return pd.DataFrame(records)


def write_group_results(group_df: pd.DataFrame, out_path: pathlib.Path,
                         group_label: str) -> list[dict]:
    """
    For one taxonomic group, compute per-model metrics and write CSV files.
    Returns a list of metric dicts (one per model) for the roll-up summary.
    """
    out_path.mkdir(parents=True, exist_ok=True)

    # Deduplicate by glycan (one glycan may appear multiple times after explode)
    glycan_df = group_df.drop_duplicates(subset='glycan')
    n = len(glycan_df)

    if n < MIN_SAMPLES:
        return []

    true_labels = glycan_df['true_label'].astype(int).values
    summary_rows = []

    for model in MODELS:
        prob_col = f"{model}_prob"
        pred_col = f"{model}_pred"
        if prob_col not in glycan_df.columns:
            continue
        probs = glycan_df[prob_col].values.astype(float)
        preds = glycan_df[pred_col].values.astype(int)
        m = compute_metrics(true_labels, probs, preds)
        m['model']  = model
        m['group']  = group_label
        summary_rows.append(m)

    if summary_rows:
        metrics_df = pd.DataFrame(summary_rows)
        front = ['model', 'group', 'n_samples', 'accuracy', 'roc_auc',
                 'f1', 'precision', 'recall', 'specificity', 'mcc',
                 'tp', 'tn', 'fp', 'fn']
        metrics_df = metrics_df[[c for c in front if c in metrics_df.columns]]
        metrics_df.to_csv(out_path / "metrics.csv", index=False)

    # Save predictions for this group
    pred_cols = ['glycan', 'true_label'] + \
                [c for m in MODELS for c in (f"{m}_prob", f"{m}_pred") if c in glycan_df.columns]
    glycan_df[pred_cols].to_csv(out_path / "predictions.csv", index=False)

    return summary_rows


# ── main ─────────────────────────────────────────────────────────────────────

def main():
    if not PRED_F.exists():
        print(f"ERROR: {PRED_F} not found.")
        print("Run Backend/evaluation/train_evaluate.py first.")
        return

    print(f"Reading {PRED_F} …")
    df = pd.read_csv(PRED_F)
    print(f"  {len(df)} test-set rows, columns: {list(df.columns)}")

    # Verify required columns
    required = ['glycan', 'true_label', 'MPNN_prob', 'MPNN_pred']
    missing  = [c for c in required if c not in df.columns]
    if missing:
        print(f"ERROR: missing columns: {missing}")
        return

    # Explode multi-species rows
    print("Expanding multi-species rows …")
    exp = expand_species_rows(df)
    print(f"  {len(exp)} rows after expansion")

    family_summary = []
    phylum_summary = []

    # ── per-family ────────────────────────────────────────────────────────────
    print("\nComputing per-family metrics …")
    for family, grp in exp.groupby('family_single'):
        phylum_vals = grp['phylum_single'].dropna().unique()
        phylum_tag  = phylum_vals[0] if len(phylum_vals) == 1 else 'mixed'
        safe_phylum = sanitise(phylum_tag)
        safe_family = sanitise(family)

        out_path = OUT_DIR / safe_phylum / safe_family
        rows = write_group_results(grp, out_path, group_label=family)
        family_summary.extend(rows)
        if rows:
            best_auc = max(r.get('roc_auc', 0) or 0 for r in rows)
            print(f"  {family:<40} n={rows[0]['n_samples']:>3}  "
                  f"best AUC={best_auc:.4f}  → {out_path.relative_to(ROOT)}")

    # ── per-phylum ────────────────────────────────────────────────────────────
    print("\nComputing per-phylum metrics …")
    phylum_out = OUT_DIR / "_by_phylum"
    for phylum, grp in exp.groupby('phylum_single'):
        safe_phylum = sanitise(phylum)
        out_path = phylum_out / safe_phylum
        rows = write_group_results(grp, out_path, group_label=phylum)
        phylum_summary.extend(rows)
        if rows:
            best_auc = max(r.get('roc_auc', 0) or 0 for r in rows)
            print(f"  {phylum:<40} n={rows[0]['n_samples']:>3}  "
                  f"best AUC={best_auc:.4f}")

    # ── summary roll-ups ──────────────────────────────────────────────────────
    front = ['group', 'model', 'n_samples', 'accuracy', 'roc_auc',
             'f1', 'precision', 'recall', 'specificity', 'mcc',
             'tp', 'tn', 'fp', 'fn']

    if family_summary:
        fs_df = pd.DataFrame(family_summary)
        fs_df = fs_df[[c for c in front if c in fs_df.columns]]
        fs_df.sort_values(['group', 'model']).to_csv(
            OUT_DIR / "summary_by_family.csv", index=False)
        print(f"\nWrote summary_by_family.csv  ({len(fs_df)} rows)")

    if phylum_summary:
        ps_df = pd.DataFrame(phylum_summary)
        ps_df = ps_df[[c for c in front if c in ps_df.columns]]
        ps_df.sort_values(['group', 'model']).to_csv(
            OUT_DIR / "summary_by_phylum.csv", index=False)
        print(f"Wrote summary_by_phylum.csv  ({len(ps_df)} rows)")

    print(f"\nAll per-pathogen results in: {OUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
