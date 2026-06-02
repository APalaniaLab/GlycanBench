import pandas as pd
import numpy as np
import re
from Bio.Align import PairwiseAligner
from Bio.Align.substitution_matrices import Array
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from difflib import get_close_matches

# Pydantic models
class AlignRequest(BaseModel):
    sequence1: str
    sequence2: str
    use_custom_scoring: bool = False
    match_score: float = 5.0
    mismatch_score: float = -5.0
    open_gap_score: float = -10.0
    extend_gap_score: float = -2.0

class AlignResponse(BaseModel):
    alignment: dict

# ==========================================================
# 🔹 FastAPI Setup
# ==========================================================
seq_align_api = APIRouter()

# ==========================================================
# 🔹 Load Glycan Substitution Matrix and Vocabulary (Default)
# ==========================================================
try:
    print("🔹 Loading glycan substitution matrix and vocabulary...")
    df = pd.read_excel("dataset/GLYSUM.xlsx", index_col=0)

    # Separate glycans and linkages based on pattern
    all_elements = df.index.astype(str).tolist()
    linkage_pattern = re.compile(r'^[ab]\d+-\d+$')
    
    glycan_vocabulary = set([elem for elem in all_elements if not linkage_pattern.match(elem)])
    known_linkages = set([elem for elem in all_elements if linkage_pattern.match(elem)])

    substitution_scores_default = df.to_numpy(dtype=float)
    glycan_names_default = list(df.index.astype(str))

    # Add UNK1 & UNK2 with zero score
    for unk in ["UNK1", "UNK2"]:
        if unk not in glycan_names_default:
            glycan_names_default.append(unk)
            substitution_scores_default = np.pad(
                substitution_scores_default, ((0, 1), (0, 1)),
                mode="constant", constant_values=0
            )

    substitution_matrix_default = Array(tuple(glycan_names_default), data=substitution_scores_default)
    print(f"✅ Substitution matrix loaded!")
    print(f"   Total elements: {len(glycan_names_default)}")
    print(f"   Glycans: {len(glycan_vocabulary)}")
    print(f"   Linkages: {len(known_linkages)}\n")

except Exception as e:
    print("❌ Error loading GLYSUM.xlsx:", e)
    print("⚠️ Will use basic vocabulary as fallback")
    # Fallback to basic vocabulary
    glycan_vocabulary = { 
    "Glc","Man","Gal","Gul","Alt","All","Tal","Ido",
    "GlcNAc","ManNAc","GalNAc","GulNAc","AltNAc","AllNAc","TalNAc","IdoNAc",
    "GlcN","ManN","GalN","GulN","AltN","AllN","TalN","IdoN",
    "GlcA","ManA","GalA","GulA","AltA","AllA","TalA","IdoA",
    "Qui","Rha","6dGul","6dAlt","6dTal","Fuc",
    "QuiNAc","RhaNAc","6dAltNAc","6dTalNAc","FucNAc",
    "Oli","Tyv","Abe","Par","Dig","Col",
    "Ara","Lyx","Xyl","Rib",
    "Kdn","KDN","Neu5Ac","Neu5Gc","Neu","Sia","NeuAc","NeuGc",
    "Pse","Leg","Aci","4eLeg",
    "Bac","LDmanHep","Kdo","Dha","DDmanHep","MurNAc","MurNGc","Mur",
    "Api","Fru","Tag","Sor","Psi"
    }
    known_linkages = {
    "a1-1","a1-2","a1-3","a1-4","a1-5","a1-6","a1-7","a1-8",
    "a2-1","a2-2","a2-3","a2-4","a2-5","a2-6","a2-7","a2-8","a2-9",
    "b1-1","b1-2","b1-3","b1-4","b1-5","b1-6","b1-7","b1-8","b1-9",
    "b2-1","b2-2","b2-3","b2-4","b2-5","b2-6","b2-7","b2-8",
    "b3-3",
    }
    substitution_matrix_default = None


# ==========================================================
# 🔹 Helper Functions
# ==========================================================
def find_closest_glycan(word):
    if word in glycan_vocabulary:
        return word
    matches = get_close_matches(word, glycan_vocabulary, n=1, cutoff=0.85)
    return matches[0] if matches else "UNK1"


def parse_glycan_sequence(seq_str):
    glycan_list = []
    pattern = r"([A-Za-z0-9]+)(\([^\)]+\))?"
    matches = re.findall(pattern, seq_str)

    for glycan, linkage in matches:
        matched = find_closest_glycan(glycan)
        glycan_list.append(matched)

        if linkage:
            link = linkage.strip("()").replace("α", "a").replace("β", "b")
            if link in known_linkages:
                glycan_list.append(link)
            else:
                glycan_list.append("UNK2")

    return glycan_list


# ==========================================================
# 🔹 Alignment Route
# ==========================================================
@seq_align_api.post("/api/align", response_model=AlignResponse)
def align_glycans(request: AlignRequest):
    try:
        seq_str1 = request.sequence1
        seq_str2 = request.sequence2
        
        # Debug: Print received parameters
        print(f"🔹 Received scoring parameters:")
        print(f"   Use Custom Scoring: {request.use_custom_scoring}")
        print(f"   Match Score: {request.match_score}")
        print(f"   Mismatch Score: {request.mismatch_score}")
        print(f"   Open Gap Score: {request.open_gap_score}")
        print(f"   Extend Gap Score: {request.extend_gap_score}")

        # Parse sequences
        seq1 = parse_glycan_sequence(seq_str1)
        seq2 = parse_glycan_sequence(seq_str2)

        if not seq1 or not seq2:
            raise HTTPException(status_code=400, detail="Invalid glycan sequences")

        # Configure aligner
        aligner = PairwiseAligner()
        aligner.mode = "global"
        
        if request.use_custom_scoring:
            # Use custom scoring parameters
            print("🔹 Using CUSTOM scoring parameters")
            
            # Get all unique elements from both sequences
            all_elements = list(set(seq1 + seq2))
            
            # Create substitution matrix with user-defined scores
            matrix_size = len(all_elements)
            substitution_scores = np.zeros((matrix_size, matrix_size))
            
            for i in range(matrix_size):
                for j in range(matrix_size):
                    if i == j:
                        substitution_scores[i][j] = request.match_score
                    else:
                        substitution_scores[i][j] = request.mismatch_score
            
            substitution_matrix = Array(tuple(all_elements), data=substitution_scores)
            aligner.substitution_matrix = substitution_matrix
            
            print(f"   Created custom matrix for elements: {all_elements}")
            print(f"   Matrix diagonal (matches): {request.match_score}")
            print(f"   Matrix off-diagonal (mismatches): {request.mismatch_score}")
        else:
            # Use default GLYSUM matrix
            print("🔹 Using DEFAULT GLYSUM.xlsx scoring matrix")
            if substitution_matrix_default is not None:
                aligner.substitution_matrix = substitution_matrix_default
            else:
                raise HTTPException(status_code=500, detail="Default substitution matrix not available")
        
        # Set gap penalties
        aligner.open_gap_score = request.open_gap_score
        aligner.extend_gap_score = request.extend_gap_score
        
        print(f"🔹 Aligner configured:")
        print(f"   Open gap score: {aligner.open_gap_score}")
        print(f"   Extend gap score: {aligner.extend_gap_score}")

        alignment = aligner.align(seq1, seq2)[0]
        score = alignment.score

        aligned1 = alignment.aligned[0]
        aligned2 = alignment.aligned[1]

        seq1_aligned = []
        seq2_aligned = []
        i = j = 0

        # 🔥 FIX: prevent ambiguous truth testing
        if len(aligned1) > 0 and len(aligned2) > 0:
            start1, start2 = aligned1[0][0], aligned2[0][0]
            while i < start1:
                seq1_aligned.append(seq1[i])
                seq2_aligned.append("-")
                i += 1
            while j < start2:
                seq1_aligned.append("-")
                seq2_aligned.append(seq2[j])
                j += 1

        # Internal blocks
        for (s1, e1), (s2, e2) in zip(aligned1, aligned2):
            while i < s1:
                seq1_aligned.append(seq1[i])
                seq2_aligned.append("-")
                i += 1
            while j < s2:
                seq1_aligned.append("-")
                seq2_aligned.append(seq2[j])
                j += 1
            for x, y in zip(seq1[s1:e1], seq2[s2:e2]):
                seq1_aligned.append(x)
                seq2_aligned.append(y)
            i, j = e1, e2

        # Trailing gaps
        while i < len(seq1):
            seq1_aligned.append(seq1[i])
            seq2_aligned.append("-")
            i += 1
        while j < len(seq2):
            seq1_aligned.append("-")
            seq2_aligned.append(seq2[j])
            j += 1

        # ======================================================
        # 🔥 FIXED OUTPUT FORMAT (GLYCAN BENCH LINE-UP)
        # ======================================================
        seq1_display_parts = []
        seq2_display_parts = [];
        match_parts = []
        matches = total = 0

        for a, b in zip(seq1_aligned, seq2_aligned):
            width = max(len(a), len(b)) + 2
            seq1_display_parts.append(a.ljust(width))
            seq2_display_parts.append(b.ljust(width))

            if a == b and a not in ["-", "UNK1", "UNK2"]:
                match_parts.append("|".ljust(width))
                matches += 1
            else:
                match_parts.append(" ".ljust(width))
            total += 1

        seq1_display = "".join(seq1_display_parts).rstrip()
        match_line = "".join(match_parts).rstrip()
        seq2_display = "".join(seq2_display_parts).rstrip()

        percent = (matches / total * 100) if total else 0
        observation = f"{matches} out of {total} elements matched ({percent:.2f}% identity)."

        return AlignResponse(alignment={
            "seq1": seq1_display,
            "match_line": match_line,
            "seq2": seq2_display,
            "score": score,
            "observation": observation
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
