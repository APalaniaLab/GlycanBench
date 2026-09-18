"""
deduplicate_dataset.py
======================
Resolves the 12 contradictory labels in merged_glycan_dataset.csv and writes
a clean copy (merged_glycan_dataset_clean.csv) to the same directory.

Root cause
----------
merged_glycan_dataset.csv is a concatenation of two source files:
  - glycobase.csv      (1,320 rows)  label assigned by glycowork / SugarBase
  - immunogenic_glycans_clean.csv (36 rows)  hand-curated positives (label=1)

Twelve glycan strings appear in both files with opposite labels
(0 from glycobase, 1 from immunogenic_glycans_clean).  The curated label
is the authoritative one: these are experimentally confirmed antigens.

Resolution strategy
-------------------
For each duplicate glycan string that has conflicting labels, keep the row
whose source is immunogenic_glycans_clean.csv (label=1) and drop the
corresponding glycobase.csv row (label=0).  Duplicate rows with *identical*
labels are deduplicated by keeping the first occurrence.

Result: 1,344 unique glycans (12 conflict rows removed), all labels consistent.

Usage
-----
  python Backend/dataset/deduplicate_dataset.py

The output file (merged_glycan_dataset_clean.csv) is the file that
generate_vocab.py and any retraining scripts should reference.
The original merged_glycan_dataset.csv is kept for audit purposes.
"""

import pathlib
import pandas as pd

HERE = pathlib.Path(__file__).parent
INPUT_CSV  = HERE / "merged_glycan_dataset.csv"
OUTPUT_CSV = HERE / "merged_glycan_dataset_clean.csv"


def main() -> None:
    df = pd.read_csv(INPUT_CSV)
    df["label"] = df["label"].astype(float)

    before = len(df)

    # Identify glycan strings that have more than one distinct label
    label_counts = df.groupby("glycan")["label"].nunique()
    conflicting = set(label_counts[label_counts > 1].index)

    if not conflicting:
        print("No conflicting labels found — dataset is already clean.")
        df.to_csv(OUTPUT_CSV, index=False)
        return

    print(f"Found {len(conflicting)} glycan string(s) with contradictory labels:")
    for g in sorted(conflicting):
        rows = df[df["glycan"] == g][["glycan", "label", "source"]]
        for _, r in rows.iterrows():
            print(f"  [{r['source']}] label={int(r['label'])}  {r['glycan'][:70]}")

    # For each conflicting glycan, drop the glycobase.csv row (label=0).
    # The immunogenic_glycans_clean.csv row (label=1) is retained.
    indices_to_drop = []
    for g in conflicting:
        mask = (df["glycan"] == g) & (df["source"] == "glycobase.csv") & (df["label"] == 0.0)
        indices_to_drop.extend(df[mask].index.tolist())

    df_clean = df.drop(index=indices_to_drop).reset_index(drop=True)

    # Also collapse any remaining exact duplicates (same glycan + same label)
    df_clean = df_clean.drop_duplicates(subset="glycan", keep="first").reset_index(drop=True)

    after = len(df_clean)
    removed = before - after

    print(f"\nRows before: {before}")
    print(f"Rows after:  {after}  ({removed} conflict row(s) removed)")

    # Final sanity check
    remaining_conflicts = df_clean.groupby("glycan")["label"].nunique()
    remaining_conflicts = remaining_conflicts[remaining_conflicts > 1]
    if len(remaining_conflicts):
        print(f"WARNING: {len(remaining_conflicts)} conflict(s) remain — inspect manually.")
    else:
        print("Verification passed: all glycan strings have a unique label.")

    df_clean.to_csv(OUTPUT_CSV, index=False)
    print(f"\nClean dataset written to: {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
