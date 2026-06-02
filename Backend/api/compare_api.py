from rdkit import Chem, DataStructs
from rdkit.Chem import AllChem, rdMolDescriptors
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

# Pydantic models
class CompareRequest(BaseModel):
    smiles1: str
    smiles2: str
    fingerprints: List[str]

compare_api = APIRouter()

# Fingerprint mapping
FP_MAP = {
    "Morgan_R2": lambda m: AllChem.GetMorganFingerprintAsBitVect(m, radius=2, nBits=2048),
    "Morgan_R3": lambda m: AllChem.GetMorganFingerprintAsBitVect(m, radius=3, nBits=2048),
    "AtomPair": lambda m: rdMolDescriptors.GetHashedAtomPairFingerprintAsBitVect(m, nBits=2048),
    "Torsion": lambda m: rdMolDescriptors.GetHashedTopologicalTorsionFingerprintAsBitVect(m, nBits=2048),
    "RDKit": lambda m: Chem.RDKFingerprint(m, maxPath=7, fpSize=2048),
}

# Tanimoto similarity
def tanimoto(fp1, fp2):
    return DataStructs.TanimotoSimilarity(fp1, fp2)

# API endpoint
@compare_api.post("/api/compare_glycans")
def compare_glycans(request: CompareRequest):
    smiles1 = request.smiles1
    smiles2 = request.smiles2
    selected = request.fingerprints

    if not smiles1 or not smiles2:
        raise HTTPException(status_code=400, detail="SMILES1 and SMILES2 required")
    if not selected:
        raise HTTPException(status_code=400, detail="Select at least one fingerprint")

    mol1 = Chem.MolFromSmiles(smiles1)
    mol2 = Chem.MolFromSmiles(smiles2)
    if mol1 is None or mol2 is None:
        raise HTTPException(status_code=400, detail="Invalid SMILES")

    similarities = {}
    for fp in selected:
        if fp in FP_MAP:
            fp1 = FP_MAP[fp](mol1)
            fp2 = FP_MAP[fp](mol2)
            similarities[fp] = tanimoto(fp1, fp2)

    return similarities
