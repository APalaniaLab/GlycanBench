"""
make_split.py
=============
Stamps a reproducible stratified 80:20 train/test split into
merged_glycan_dataset_clean.csv by writing a 'split' column
('train' or 'test') deterministically (random_state=42).

Run once to fix the split; subsequent runs produce the identical result.

Usage (from repo root):
    python Backend/dataset/make_split.py
"""

import pathlib
import pandas as pd
from sklearn.model_selection import train_test_split

HERE   = pathlib.Path(__file__).parent
CSV    = HERE / "merged_glycan_dataset_clean.csv"


def main() -> None:
    df = pd.read_csv(CSV)
    df["label"] = df["label"].astype(float)

    # --- stratified 80/20 split, fixed seed ---
    train_idx, test_idx = train_test_split(
        df.index,
        test_size=0.20,
        random_state=42,
        stratify=df["label"],
    )

    df["split"] = "train"
    df.loc[test_idx, "split"] = "test"

    # Sanity-check
    tr = df[df["split"] == "train"]
    te = df[df["split"] == "test"]

    print("=== Split summary ===")
    print(f"Total   : {len(df):>5}   (label 0: {int((df['label']==0).sum())}, label 1: {int((df['label']==1).sum())})")
    print(f"Train   : {len(tr):>5}   (label 0: {int((tr['label']==0).sum())}, label 1: {int((tr['label']==1).sum())})")
    print(f"Test    : {len(te):>5}   (label 0: {int((te['label']==0).sum())}, label 1: {int((te['label']==1).sum())})")

    df.to_csv(CSV, index=False)
    print(f"\nSplit written to: {CSV}")
    print("Reproduce exactly: train_test_split(..., test_size=0.20, random_state=42, stratify=label)")


if __name__ == "__main__":
    main()
