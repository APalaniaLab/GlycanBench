from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from glycowork.motif.processing import canonicalize_iupac, IUPAC_to_SMILES
from rdkit import Chem
from rdkit.Chem import AllChem

# Pydantic models
class VisualizeRequest(BaseModel):
    iupac: str

class VisualizeResponse(BaseModel):
    molBlock: str

visualize_api = APIRouter()

@visualize_api.post("/api/visualize", response_model=VisualizeResponse)
def convert_glycan(request: VisualizeRequest):
    iupac_seq = request.iupac
    
    if not iupac_seq:
        raise HTTPException(status_code=400, detail="Missing glycan sequence")

    try:
        canonical_seq = canonicalize_iupac(iupac_seq.strip())
        smiles = IUPAC_to_SMILES([canonical_seq])[0]

        if not smiles:
            raise HTTPException(status_code=400, detail="Failed to convert to SMILES")

        mol = Chem.MolFromSmiles(smiles)
        mol = Chem.AddHs(mol)

        if AllChem.EmbedMolecule(mol, randomSeed=0xf00d) != 0:
            raise HTTPException(status_code=500, detail="3D embedding failed")

        AllChem.MMFFOptimizeMolecule(mol)
        mol_block = Chem.MolToMolBlock(mol)

        return VisualizeResponse(molBlock=mol_block)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))