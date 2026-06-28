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

def _optimize_3d(mol: Chem.Mol) -> Chem.Mol:
    """
    Generate and minimize a 3D conformer.

    Strategy:
      1. Try ETKDGv3 (best distance geometry for ring-heavy molecules like sugars).
      2. Minimize with MMFF94s (the 'static' variant, better for ring systems).
         Run up to 2000 iterations and re-run if not converged.
      3. If MMFF94s is unavailable for this molecule, fall back to UFF.
    """
    params = AllChem.ETKDGv3()
    params.randomSeed = 0xf00d
    params.enforceChirality = True
    params.useSmallRingTorsions = True   # improves pyranose ring geometry
    params.useMacrocycleTorsions = False

    if AllChem.EmbedMolecule(mol, params) != 0:
        # ETKDGv3 failed — fall back to classic ETKDG
        params2 = AllChem.EmbedParameters()
        params2.randomSeed = 0xf00d
        if AllChem.EmbedMolecule(mol, params2) != 0:
            raise ValueError("3D embedding failed for this structure")

    # Try MMFF94s first (better for cyclic / carbohydrate systems)
    ff = AllChem.MMFFGetMoleculeForceField(
        mol, AllChem.MMFFGetMoleculeProperties(mol, mmffVariant="MMFF94s")
    )
    if ff is not None:
        ff.Minimize(maxIts=2000)
        # If not converged, run a second pass
        if ff.CalcEnergy() > 1e6:
            ff.Minimize(maxIts=2000)
    else:
        # Fallback to UFF when MMFF94s cannot be set up
        uff = AllChem.UFFGetMoleculeForceField(mol)
        if uff is not None:
            uff.Minimize(maxIts=2000)
        else:
            raise ValueError("No force field available for this molecule")

    return mol


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
        if mol is None:
            raise HTTPException(status_code=400, detail="Invalid SMILES produced from IUPAC sequence")

        mol = Chem.AddHs(mol)
        mol = _optimize_3d(mol)
        mol_block = Chem.MolToMolBlock(mol)

        return VisualizeResponse(molBlock=mol_block)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))