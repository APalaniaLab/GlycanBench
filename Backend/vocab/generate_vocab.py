import pandas as pd
import json
import re
import os

# --- Helper functions ---
def motif_find(s):
  """converts a IUPACcondensed-ish glycan into a list of overlapping, asterisk-separated glycowords"""
  b = s.split('(')
  b = [k.split(')') for k in b]
  b = [item for sublist in b for item in sublist]
  b = [k.strip('[') for k in b]
  b = [k.strip(']') for k in b]
  b = [k.replace('[', '') for k in b]
  b = [k.replace(']', '') for k in b]
  b = ['*'.join(b[i:i+5]) for i in range(0, len(b)-4, 2)]
  return b

def process_glycans(glycan_list):
  """converts list of glycans into a list of lists of glycowords"""
  glycan_motifs = [motif_find(k) for k in glycan_list]
  glycan_motifs = [[i.split('*') for i in k] for k in glycan_motifs]
  return glycan_motifs

# --- Main script logic ---
print("Generating vocabulary for the backend...")

DATASET_PATH = "dataset/merged_glycan_dataset.csv"
OUTPUT_FILE = "glycoword_vocab.json"

if not os.path.exists(DATASET_PATH):
    print(f"Error: Dataset not found at {DATASET_PATH}")
    exit()

# This assumes the dataset is available at this path
df_immuno = pd.read_csv(DATASET_PATH)

# Clean data as in the original training script
df_immuno.dropna(subset=['label'], inplace=True)
df_immuno['label'] = df_immuno['label'].astype(int)

# Process glycans to get glycowords
df_immuno['glycan_processed'] = process_glycans(df_immuno.glycan.values.tolist())

# Create the library (vocabulary) of unique glycowords
lib_nested_list = [item for sublist in df_immuno.glycan_processed.values.tolist() for item in sublist]
unique_tuples = sorted(list(set(tuple(i) for i in lib_nested_list)))
lib = [list(k) for k in unique_tuples]

# Save the vocabulary to a JSON file
with open(OUTPUT_FILE, 'w') as f:
    json.dump(lib, f)

print(f"Vocabulary with {len(lib)} unique glycowords saved to {OUTPUT_FILE}")