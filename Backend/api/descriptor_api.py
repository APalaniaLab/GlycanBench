# descriptor_api.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from glycowork.motif.processing import canonicalize_iupac, IUPAC_to_SMILES
from rdkit import Chem, RDLogger
from rdkit.Chem import Descriptors, rdMolDescriptors, AllChem, DataStructs
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
import math

# Silence RDKit logging (warnings printed to console)
RDLogger.DisableLog('rdApp.*')

# Pydantic models
class DescriptorRequest(BaseModel):
    format: str
    data: str
    include_fingerprints: bool = True
    include_similarities: bool = False
    compare_to: Optional[str] = None

descriptor_api = APIRouter()

# ---------------------------
# Utility helpers
# ---------------------------
def mol_is_valid(smiles: str) -> bool:
    if not smiles or not isinstance(smiles, str):
        return False
    s = smiles.strip()
    if s == "":
        return False
    return Chem.MolFromSmiles(s) is not None

def bitvect_to_list(bitvect) -> List[int]:
    """Convert RDKit ExplicitBitVect to a list of 0/1 ints."""
    if bitvect is None:
        return []
    try:
        arr = list(bitvect.ToBitString())  # arr is ['0','1',...], convert to ints
        return [int(x) for x in arr]
    except Exception:
        # fallback: iterate bits
        size = bitvect.GetNumBits()
        return [int(bitvect.GetBit(i)) for i in range(size)]

def safe_float(x: Any) -> Any:
    """Return JSON-safe float (avoid numpy types)."""
    if x is None:
        return None
    if isinstance(x, (float, int)):
        # convert NaN/inf to None
        if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
            return None
        return float(x)
    try:
        return float(x)
    except Exception:
        return x

# ---------------------------
# Glycan property calculator
# ---------------------------
class GlycanPropertyCalculator:
    """Calculate useful molecular properties for glycan structures."""
    
    def __init__(self):
        pass

    def calculate_basic_properties(self, mol: Chem.Mol) -> Dict[str, Any]:
        if mol is None:
            return {}
        
        props = {
            'Molecular_Weight': safe_float(Descriptors.MolWt(mol)),
            'Exact_Molecular_Weight': safe_float(Descriptors.ExactMolWt(mol)),
            'Heavy_Atom_Count': int(mol.GetNumHeavyAtoms()),
            'Num_Atoms': int(mol.GetNumAtoms()),
            'Molecular_Formula': rdMolDescriptors.CalcMolFormula(mol),
            'Num_Stereo_Centers': int(rdMolDescriptors.CalcNumAtomStereoCenters(mol)),
            'Num_Unspecified_Stereo_Centers': int(rdMolDescriptors.CalcNumUnspecifiedAtomStereoCenters(mol)),
            'Ring_Count': int(rdMolDescriptors.CalcNumRings(mol)),
            'Aliphatic_Rings': int(rdMolDescriptors.CalcNumAliphaticRings(mol)),
            'Saturated_Rings': int(rdMolDescriptors.CalcNumSaturatedRings(mol)),
            'H_Bond_Donors': int(rdMolDescriptors.CalcNumHBD(mol)),
            'H_Bond_Acceptors': int(rdMolDescriptors.CalcNumHBA(mol)),
            'Num_Rotatable_Bonds': int(rdMolDescriptors.CalcNumRotatableBonds(mol)),
            'TPSA': safe_float(Descriptors.TPSA(mol)),
            'LogP': safe_float(Descriptors.MolLogP(mol)),
            # Correct RDKit call for fraction sp3
            'Fraction_Csp3': safe_float(rdMolDescriptors.CalcFractionCSP3(mol)),
            'Molar_Refractivity': safe_float(Descriptors.MolMR(mol)),
        }
        return props

    def calculate_elemental_composition(self, mol: Chem.Mol) -> Dict[str, int]:
        comp: Dict[str, int] = {}
        for atom in mol.GetAtoms():
            symbol = atom.GetSymbol()
            comp[symbol] = comp.get(symbol, 0) + 1
        # normalize keys to Count_<Element>
        return {f'Count_{k}': int(v) for k, v in comp.items()}

    def calculate_oxygen_nitrogen_ratio(self, mol: Chem.Mol) -> Optional[float]:
        comp = self.calculate_elemental_composition(mol)
        o = comp.get('Count_O', 0)
        n = comp.get('Count_N', 0)
        if n == 0:
            return None
        return float(o) / float(n)

    def search_motif(self, mol: Chem.Mol, smarts: str) -> int:
        if mol is None or not smarts:
            return 0
        pattern = Chem.MolFromSmarts(smarts)
        if pattern is None:
            return 0
        matches = mol.GetSubstructMatches(pattern)
        return len(matches)

    def calculate_glycan_specific_features(self, mol: Chem.Mol) -> Dict[str, int]:
        # Improved SMARTS for ring oxygen-containing rings.
        # These SMARTS are general — real glycan motif detection may require more specific patterns.
        motifs = {
            # 6-member pyranose rings often represented by ring O + 5 ring atoms
            # (r5 here means ring of size 5 in SMARTS counting the oxygen as one; adapt if necessary)
            'Pyranose_Rings': '[OX2r5;!R0]',
            # 5-member rings with an O
            'Furanose_Rings': '[OX2r4;!R0]',
            # N-acetyl (approximate): N-C(=O)
            'N_Acetyl_Groups': '[NX3][CX3](=O)',
            # carboxyl (simple)
            'Carboxyl_Groups': '[CX3](=O)[OX1H,OX2-]',
            # sulfate groups (approximate)
            'Sulfate_Groups': 'S(=O)(=O)[OX2H,OX2-]'
        }
        return {k: int(self.search_motif(mol, v)) for k, v in motifs.items()}

    def generate_fingerprints(self, mol: Chem.Mol, n_bits: int = 2048) -> Dict[str, List[int]]:
        """Generate multiple fingerprint types and return as lists of ints for JSON."""
        fps: Dict[str, List[int]] = {}
        
        try:
            m_r2 = AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=n_bits)
            fps['Morgan_R2'] = bitvect_to_list(m_r2)
        except Exception:
            fps['Morgan_R2'] = []
            
        try:
            m_r3 = AllChem.GetMorganFingerprintAsBitVect(mol, radius=3, nBits=n_bits)
            fps['Morgan_R3'] = bitvect_to_list(m_r3)
        except Exception:
            fps['Morgan_R3'] = []
            
        try:
            ap = AllChem.GetHashedAtomPairFingerprintAsBitVect(mol, nBits=n_bits)
            fps['AtomPair'] = bitvect_to_list(ap)
        except Exception:
            fps['AtomPair'] = []
            
        try:
            tors = AllChem.GetHashedTopologicalTorsionFingerprintAsBitVect(mol, nBits=n_bits)
            fps['Torsion'] = bitvect_to_list(tors)
        except Exception:
            fps['Torsion'] = []
            
        try:
            rd_fp = Chem.RDKFingerprint(mol, maxPath=7, fpSize=n_bits)
            fps['RDKit'] = bitvect_to_list(rd_fp)
        except Exception:
            fps['RDKit'] = []
            
        return fps

    def calculate_fingerprint_similarities(self, fp_a_list: List[int], fp_b_list: List[int]) -> Optional[float]:
        """Calculate Tanimoto similarity for two bit lists using RDKit DataStructs (expects same length)."""
        if not fp_a_list or not fp_b_list:
            return None
        try:
            # rebuild ExplicitBitVect from bitstring for DataStructs
            s_a = ''.join(str(int(bool(x))) for x in fp_a_list)
            s_b = ''.join(str(int(bool(x))) for x in fp_b_list)
            
            bv_a = DataStructs.ExplicitBitVect(len(s_a))
            bv_b = DataStructs.ExplicitBitVect(len(s_b))
            
            # set bits
            for i, ch in enumerate(s_a):
                if ch == '1':
                    bv_a.SetBit(i)
            for i, ch in enumerate(s_b):
                if ch == '1':
                    bv_b.SetBit(i)
                    
            return float(DataStructs.TanimotoSimilarity(bv_a, bv_b))
        except Exception:
            # fallback: compute intersection/union on lists of ints
            try:
                a = fp_a_list
                b = fp_b_list
                inter = sum(1 for i, j in zip(a, b) if i and j)
                union = sum(1 for i, j in zip(a, b) if i or j)
                if union == 0:
                    return 0.0
                return float(inter) / float(union)
            except Exception:
                return None

    def analyze_glycan(self,
                      smiles: str,
                      include_fingerprints: bool = True,
                      include_similarities: bool = False,
                      compare_to_smiles: Optional[str] = None) -> Dict[str, Any]:
        """Full analysis returning JSON-safe types."""
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return {'error': 'Invalid SMILES structure'}
        
        result: Dict[str, Any] = {}
        
        result.update(self.calculate_basic_properties(mol))
        
        # elemental composition with normalized keys
        elem = self.calculate_elemental_composition(mol)
        result.update(elem)
        
        # O/N ratio
        on_ratio = self.calculate_oxygen_nitrogen_ratio(mol)
        result['O_N_Ratio'] = None if on_ratio is None else float(on_ratio)
        
        # glycan-specific motifs
        glycan_features = self.calculate_glycan_specific_features(mol)
        result.update(glycan_features)
        
        # fingerprints
        if include_fingerprints:
            fps = self.generate_fingerprints(mol)
            result['Fingerprints'] = fps
        
        # similarities (optional)
        if include_similarities and compare_to_smiles:
            if mol_is_valid(compare_to_smiles):
                other_mol = Chem.MolFromSmiles(compare_to_smiles.strip())
                other_fps = self.generate_fingerprints(other_mol)
                sims = {}
                for k in ['Morgan_R2', 'Morgan_R3', 'AtomPair', 'Torsion', 'RDKit']:
                    sims[k] = self.calculate_fingerprint_similarities(
                        result.get('Fingerprints', {}).get(k, []),
                        other_fps.get(k, [])
                    )
                result['Fingerprint_Similarities'] = sims
            else:
                result['Fingerprint_Similarities_Error'] = 'compare_to_smiles is invalid'
        
        return result

# ---------------------------
# FastAPI endpoint
# ---------------------------
@descriptor_api.post("/api/descriptor")
def analyze(request: DescriptorRequest):
    """
    Accepts JSON:
    {
      "format": "IUPAC" | "SMILES",
      "data": "<string>",
      "include_fingerprints": true/false (optional),
      "include_similarities": true/false (optional),
      "compare_to": "<SMILES to compare to>" (optional, used if include_similarities true)
    }
    """
    fmt = request.format.strip()
    content = request.data
    include_fps = request.include_fingerprints
    include_sims = request.include_similarities
    compare_to = request.compare_to
    
    if not content or not isinstance(content, str) or not content.strip():
        raise HTTPException(status_code=400, detail="Empty input data")
    
    smiles = None
    canonical_iupac = None
    
    try:
        if fmt.upper() == "IUPAC":
            # canonicalize then convert using glycowork
            canonical_iupac = canonicalize_iupac(content.strip())
            smiles_list = IUPAC_to_SMILES([canonical_iupac])
            if not smiles_list or not smiles_list[0]:
                raise HTTPException(status_code=400, detail="IUPAC -> SMILES conversion returned empty result")
            smiles = smiles_list[0]
        elif fmt.upper() == "SMILES":
            s = content.strip()
            if not mol_is_valid(s):
                raise HTTPException(status_code=400, detail="Invalid SMILES provided")
            smiles = s
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Supported: IUPAC, SMILES")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Conversion error: {str(e)}")
    
    # final validation
    if not mol_is_valid(smiles):
        raise HTTPException(status_code=400, detail="Resulting SMILES is invalid")
    
    calc = GlycanPropertyCalculator()
    descriptors = calc.analyze_glycan(
        smiles,
        include_fingerprints=include_fps,
        include_similarities=include_sims,
        compare_to_smiles=compare_to
    )
    
    if "error" in descriptors:
        raise HTTPException(status_code=400, detail=descriptors["error"])
    
    response = {
        "Format": fmt.upper(),
        "Input": content,
        "Canonical_IUPAC": canonical_iupac if canonical_iupac else None,
        "SMILES": smiles,
        "Properties": descriptors
    }
    
    return response
    """Return JSON-safe float (avoid numpy types)."""
    if x is None:
        return None
    if isinstance(x, (float, int)):
        # convert NaN/inf to None
        if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
            return None
        return float(x)
    try:
        return float(x)
    except Exception:
        return x


# ---------------------------
# Glycan property calculator
# ---------------------------
class GlycanPropertyCalculator:
    """Calculate useful molecular properties for glycan structures."""

    def __init__(self):
        pass

    def calculate_basic_properties(self, mol: Chem.Mol) -> Dict[str, Any]:
        if mol is None:
            return {}

        props = {
            'Molecular_Weight': safe_float(Descriptors.MolWt(mol)),
            'Exact_Molecular_Weight': safe_float(Descriptors.ExactMolWt(mol)),
            'Heavy_Atom_Count': int(mol.GetNumHeavyAtoms()),
            'Num_Atoms': int(mol.GetNumAtoms()),
            'Molecular_Formula': rdMolDescriptors.CalcMolFormula(mol),
            'Num_Stereo_Centers': int(rdMolDescriptors.CalcNumAtomStereoCenters(mol)),
            'Num_Unspecified_Stereo_Centers': int(
                rdMolDescriptors.CalcNumUnspecifiedAtomStereoCenters(mol)
            ),
            'Ring_Count': int(rdMolDescriptors.CalcNumRings(mol)),
            'Aliphatic_Rings': int(rdMolDescriptors.CalcNumAliphaticRings(mol)),
            'Saturated_Rings': int(rdMolDescriptors.CalcNumSaturatedRings(mol)),
            'H_Bond_Donors': int(rdMolDescriptors.CalcNumHBD(mol)),
            'H_Bond_Acceptors': int(rdMolDescriptors.CalcNumHBA(mol)),
            'Num_Rotatable_Bonds': int(rdMolDescriptors.CalcNumRotatableBonds(mol)),
            'TPSA': safe_float(Descriptors.TPSA(mol)),
            'LogP': safe_float(Descriptors.MolLogP(mol)),
            # Correct RDKit call for fraction sp3
            'Fraction_Csp3': safe_float(rdMolDescriptors.CalcFractionCSP3(mol)),
            'Molar_Refractivity': safe_float(Descriptors.MolMR(mol)),
        }
        return props

    def calculate_elemental_composition(self, mol: Chem.Mol) -> Dict[str, int]:
        comp: Dict[str, int] = {}
        for atom in mol.GetAtoms():
            symbol = atom.GetSymbol()
            comp[symbol] = comp.get(symbol, 0) + 1
        # normalize keys to Count_<Element>
        return {f'Count_{k}': int(v) for k, v in comp.items()}

    def calculate_oxygen_nitrogen_ratio(self, mol: Chem.Mol) -> Optional[float]:
        comp = self.calculate_elemental_composition(mol)
        o = comp.get('Count_O', 0)
        n = comp.get('Count_N', 0)
        if n == 0:
            return None
        return float(o) / float(n)

    def search_motif(self, mol: Chem.Mol, smarts: str) -> int:
        if mol is None or not smarts:
            return 0
        pattern = Chem.MolFromSmarts(smarts)
        if pattern is None:
            return 0
        matches = mol.GetSubstructMatches(pattern)
        return len(matches)

    def calculate_glycan_specific_features(self, mol: Chem.Mol) -> Dict[str, int]:
        # Improved SMARTS for ring oxygen-containing rings.
        # These SMARTS are general — real glycan motif detection may require more specific patterns.
        motifs = {
            # 6-member pyranose rings often represented by ring O + 5 ring atoms
            # (r5 here means ring of size 5 in SMARTS counting the oxygen as one; adapt if necessary)
            'Pyranose_Rings': '[OX2r5;!R0]',
            # 5-member rings with an O
            'Furanose_Rings': '[OX2r4;!R0]',
            # N-acetyl (approximate): N-C(=O)
            'N_Acetyl_Groups': '[NX3][CX3](=O)',
            # carboxyl (simple)
            'Carboxyl_Groups': '[CX3](=O)[OX1H,OX2-]',
            # sulfate groups (approximate)
            'Sulfate_Groups': 'S(=O)(=O)[OX2H,OX2-]'
        }
        return {k: int(self.search_motif(mol, v)) for k, v in motifs.items()}

    def generate_fingerprints(self, mol: Chem.Mol, n_bits: int = 2048) -> Dict[str, List[int]]:
        """Generate multiple fingerprint types and return as lists of ints for JSON."""
        fps: Dict[str, List[int]] = {}

        try:
            m_r2 = AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=n_bits)
            fps['Morgan_R2'] = bitvect_to_list(m_r2)
        except Exception:
            fps['Morgan_R2'] = []

        try:
            m_r3 = AllChem.GetMorganFingerprintAsBitVect(mol, radius=3, nBits=n_bits)
            fps['Morgan_R3'] = bitvect_to_list(m_r3)
        except Exception:
            fps['Morgan_R3'] = []

        try:
            ap = AllChem.GetHashedAtomPairFingerprintAsBitVect(mol, nBits=n_bits)
            fps['AtomPair'] = bitvect_to_list(ap)
        except Exception:
            fps['AtomPair'] = []

        try:
            tors = AllChem.GetHashedTopologicalTorsionFingerprintAsBitVect(mol, nBits=n_bits)
            fps['Torsion'] = bitvect_to_list(tors)
        except Exception:
            fps['Torsion'] = []

        try:
            rd_fp = Chem.RDKFingerprint(mol, maxPath=7, fpSize=n_bits)
            fps['RDKit'] = bitvect_to_list(rd_fp)
        except Exception:
            fps['RDKit'] = []

        return fps

    def calculate_fingerprint_similarities(
        self, fp_a_list: List[int], fp_b_list: List[int]
    ) -> Optional[float]:
        """Calculate Tanimoto similarity for two bit lists using RDKit DataStructs (expects same length)."""
        if not fp_a_list or not fp_b_list:
            return None

        try:
            # rebuild ExplicitBitVect from bitstring for DataStructs
            s_a = ''.join(str(int(bool(x))) for x in fp_a_list)
            s_b = ''.join(str(int(bool(x))) for x in fp_b_list)

            bv_a = DataStructs.ExplicitBitVect(len(s_a))
            bv_b = DataStructs.ExplicitBitVect(len(s_b))

            # set bits
            for i, ch in enumerate(s_a):
                if ch == '1':
                    bv_a.SetBit(i)
            for i, ch in enumerate(s_b):
                if ch == '1':
                    bv_b.SetBit(i)

            return float(DataStructs.TanimotoSimilarity(bv_a, bv_b))
        except Exception:
            # fallback: compute intersection/union on lists of ints
            try:
                a = fp_a_list
                b = fp_b_list
                inter = sum(1 for i, j in zip(a, b) if i and j)
                union = sum(1 for i, j in zip(a, b) if i or j)
                if union == 0:
                    return 0.0
                return float(inter) / float(union)
            except Exception:
                return None

    def analyze_glycan(
        self,
        smiles: str,
        include_fingerprints: bool = True,
        include_similarities: bool = False,
        compare_to_smiles: Optional[str] = None
    ) -> Dict[str, Any]:
        """Full analysis returning JSON-safe types."""
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return {'error': 'Invalid SMILES structure'}

        result: Dict[str, Any] = {}
        result.update(self.calculate_basic_properties(mol))

        # elemental composition with normalized keys
        elem = self.calculate_elemental_composition(mol)
        result.update(elem)

        # O/N ratio
        on_ratio = self.calculate_oxygen_nitrogen_ratio(mol)
        result['O_N_Ratio'] = None if on_ratio is None else float(on_ratio)

        # glycan-specific motifs
        glycan_features = self.calculate_glycan_specific_features(mol)
        result.update(glycan_features)

        # fingerprints
        if include_fingerprints:
            fps = self.generate_fingerprints(mol)
            result['Fingerprints'] = fps

        # similarities (optional)
        if include_similarities and compare_to_smiles:
            if mol_is_valid(compare_to_smiles):
                other_mol = Chem.MolFromSmiles(compare_to_smiles.strip())
                other_fps = self.generate_fingerprints(other_mol)
                sims = {}
                for k in ['Morgan_R2', 'Morgan_R3', 'AtomPair', 'Torsion', 'RDKit']:
                    sims[k] = self.calculate_fingerprint_similarities(
                        result.get('Fingerprints', {}).get(k, []),
                        other_fps.get(k, [])
                    )
                result['Fingerprint_Similarities'] = sims
            else:
                result['Fingerprint_Similarities_Error'] = 'compare_to_smiles is invalid'

        return result


# ---------------------------
# Flask endpoint
# ---------------------------
@descriptor_api.post("/api/descriptor")
def analyze(request: DescriptorRequest):
    """
    Accepts JSON:
    {
      "format": "IUPAC" | "SMILES",
      "data": "<string>",
      "include_fingerprints": true/false (optional),
      "include_similarities": true/false (optional),
      "compare_to": "<SMILES to compare to>" (optional, used if include_similarities true)
    }
    """
    fmt = request.format.strip()
    content = request.data
    include_fps = request.include_fingerprints
    include_sims = request.include_similarities

    if not fmt or not content:
        raise HTTPException(status_code=400, detail="Both 'format' and 'data' are required")
    compare_to = request.compare_to

    if not content or not isinstance(content, str) or not content.strip():
        return {"error": "Empty input data"}, 400

    smiles = None
    canonical_iupac = None

    try:
        if fmt.upper() == "IUPAC":
            # canonicalize then convert using glycowork
            canonical_iupac = canonicalize_iupac(content.strip())
            smiles_list = IUPAC_to_SMILES([canonical_iupac])
            if not smiles_list or not smiles_list[0]:
                return {"error": "IUPAC -> SMILES conversion returned empty result"}, 400
            smiles = smiles_list[0]
        elif fmt.upper() == "SMILES":
            s = content.strip()
            if not mol_is_valid(s):
                return {"error": "Invalid SMILES provided"}, 400
            smiles = s
        else:
            return {"error": "Unsupported format. Supported: IUPAC, SMILES"}, 400
    except Exception as e:
        return {"error": f"Conversion error: {str(e)}"}, 400

    # final validation
    if not mol_is_valid(smiles):
        return {"error": "Resulting SMILES is invalid"}, 400

    calc = GlycanPropertyCalculator()
    descriptors = calc.analyze_glycan(
        smiles,
        include_fingerprints=include_fps,
        include_similarities=include_sims,
        compare_to_smiles=compare_to
    )

    if "error" in descriptors:
        return descriptors, 400

    response = {
        "Format": fmt.upper(),
        "Input": content,
        "Canonical_IUPAC": canonical_iupac if canonical_iupac else None,
        "SMILES": smiles,
        "Properties": descriptors
    }

    return response, 200
