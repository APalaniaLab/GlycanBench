from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import io
import base64
import traceback
import numpy as np
import pandas as pd
from rdkit import Chem, DataStructs
from rdkit.Chem import AllChem, rdMolDescriptors
from scipy.cluster.hierarchy import linkage, fcluster, dendrogram
from scipy.spatial.distance import squareform
import seaborn as sns
from sklearn.cluster import KMeans
from typing import List, Optional
from glycowork.motif.processing import IUPAC_to_SMILES

# ---------------------------------------------------------------------------
# Optional glycowork graph-similarity import
# ---------------------------------------------------------------------------
try:
    from glycowork.motif.graph import compare_glycans
    _GLYCOWORK_SIMILARITY_AVAILABLE = True
except Exception:
    _GLYCOWORK_SIMILARITY_AVAILABLE = False

# Pydantic models
class GlycanInput(BaseModel):
    name: str = ""
    iupac: str = ""
    smiles: str = ""

class ClusterRequest(BaseModel):
    glycans: List[GlycanInput]
    # Agglomerative params
    distance_threshold: float = 0.5
    linkage_method: str = "average"
    # Shared params
    metric: str = "tanimoto"          # tanimoto | dice | cosine | euclidean | glycowork
    fingerprint_type: str = "morgan"
    radius: int = 2
    n_bits: int = 2048
    mode: str = "standard"
    thresholds: Optional[List[float]] = None
    # K-means params
    clustering_method: str = "agglomerative"   # "agglomerative" | "kmeans"
    n_clusters: Optional[int] = None           # used when clustering_method == "kmeans"

class ClusterResponse(BaseModel):
    status: str
    mode: Optional[str] = None
    clustering_method: Optional[str] = None
    dendrogram: Optional[str] = None
    heatmap: Optional[str] = None
    n_clusters: Optional[int] = None
    clusters: Optional[dict] = None
    singletons: Optional[List[str]] = None
    singleton_stats: Optional[List[dict]] = None
    threshold_curve: Optional[List[dict]] = None
    elbow_plot: Optional[str] = None
    params: Optional[dict] = None
    error: Optional[str] = None

cluster_api = APIRouter()

class GlycanClusterAnalyzer:
    def __init__(self, fingerprint_type="morgan", radius=2, n_bits=2048):
        self.fingerprint_type = fingerprint_type
        self.radius = radius
        self.n_bits = n_bits

    def _fingerprint(self, mol):
        if mol is None:
            raise ValueError("Cannot create fingerprint for None molecule")
        if self.fingerprint_type == "morgan":
            return AllChem.GetMorganFingerprintAsBitVect(mol, self.radius, nBits=self.n_bits)
        elif self.fingerprint_type == "atom_pair":
            return rdMolDescriptors.GetHashedAtomPairFingerprintAsBitVect(mol, nBits=self.n_bits)
        elif self.fingerprint_type == "torsion":
            return rdMolDescriptors.GetHashedTopologicalTorsionFingerprintAsBitVect(mol, nBits=self.n_bits)
        elif self.fingerprint_type == "rdkit":
            return Chem.RDKFingerprint(mol)
        else:
            raise ValueError(f"Unknown fingerprint_type: {self.fingerprint_type}")

    def _compute_distance(self, fpA, fpB, metric):
        if metric == "tanimoto":
            sim = DataStructs.TanimotoSimilarity(fpA, fpB)
        elif metric == "dice":
            sim = DataStructs.DiceSimilarity(fpA, fpB)
        elif metric == "cosine":
            sim = DataStructs.CosineSimilarity(fpA, fpB)
        elif metric == "euclidean":
            sim = DataStructs.TanimotoSimilarity(fpA, fpB)
            return float(np.sqrt(2 * (1 - sim)))
        else:
            raise ValueError(f"Unknown metric: {metric}")
        return float(1 - sim)

    # ------------------------------------------------------------------
    # glycowork-native pairwise distance matrix
    # ------------------------------------------------------------------
    @staticmethod
    def compute_glycowork_distance_matrix(iupac_list: List[str]) -> np.ndarray:
        """
        Build a pairwise distance matrix using glycowork's graph-based
        compare_glycans() similarity (1 - similarity).
        Falls back gracefully if glycowork similarity is unavailable.
        """
        if not _GLYCOWORK_SIMILARITY_AVAILABLE:
            raise ValueError(
                "glycowork graph similarity is not available in this environment. "
                "Please choose a fingerprint-based metric instead."
            )
        n = len(iupac_list)
        dist_matrix = np.zeros((n, n), dtype=float)
        for i in range(n):
            for j in range(i + 1, n):
                try:
                    sim = compare_glycans(iupac_list[i], iupac_list[j])
                    # compare_glycans returns a similarity score in [0, 1]
                    d = float(1.0 - sim)
                except Exception:
                    d = 1.0   # treat comparison failure as maximum distance
                dist_matrix[i, j] = d
                dist_matrix[j, i] = d
        return dist_matrix

    def cluster_glycans_from_dicts(self, glycan_dicts, distance_threshold=0.5, linkage_method="average", metric="tanimoto"):
        if len(glycan_dicts) < 2:
            raise ValueError("At least 2 glycans are required for clustering")

        names = [g["name"] for g in glycan_dicts]
        smiles = [g["smiles"] for g in glycan_dicts]

        # glycowork metric uses IUPAC strings, not fingerprints — handled separately
        if metric == "glycowork":
            iupac_list = [g.get("iupac") or g.get("smiles") for g in glycan_dicts]
            dist_matrix = self.compute_glycowork_distance_matrix(iupac_list)
            dist_array = squareform(dist_matrix)
        else:
            # For "ward", force metric to euclidean
            if linkage_method == "ward" and metric != "euclidean":
                metric = "euclidean"

            mols = []
            for name, s in zip(names, smiles):
                mol = Chem.MolFromSmiles(s)
                if mol is None:
                    raise ValueError(f"Invalid SMILES for {name}: {s}")
                mols.append(mol)

            fps = [self._fingerprint(m) for m in mols]
            dist = []
            n = len(fps)
            for i in range(n):
                for j in range(i + 1, n):
                    d = self._compute_distance(fps[i], fps[j], metric)
                    dist.append(d)
            dist_array = np.array(dist, dtype=float)

        if dist_array.size == 0:
            raise ValueError("Not enough data to compute pairwise distances")

        Z = linkage(dist_array, method=linkage_method)
        cluster_ids = fcluster(Z, distance_threshold, criterion="distance")

        return {
            "names": names,
            "smiles": smiles,
            "Z": Z,
            "dist_array": dist_array,
            "cluster_ids": cluster_ids,
            "n_clusters": len(set(cluster_ids)),
        }

    def cluster_glycans_kmeans(self, glycan_dicts, n_clusters=3, metric="tanimoto"):
        """K-means clustering on fingerprint bit vectors."""
        if len(glycan_dicts) < 2:
            raise ValueError("At least 2 glycans are required for clustering")
        if n_clusters < 2:
            raise ValueError("n_clusters must be at least 2")
        if n_clusters > len(glycan_dicts):
            raise ValueError(f"n_clusters ({n_clusters}) cannot exceed number of glycans ({len(glycan_dicts)})")

        names = [g["name"] for g in glycan_dicts]
        smiles = [g["smiles"] for g in glycan_dicts]

        mols = []
        for name, s in zip(names, smiles):
            mol = Chem.MolFromSmiles(s)
            if mol is None:
                raise ValueError(f"Invalid SMILES for {name}: {s}")
            mols.append(mol)

        fps = [self._fingerprint(m) for m in mols]
        # Convert RDKit fingerprints to numpy bit array
        fp_matrix = np.array([list(fp.ToBitString()) for fp in fps], dtype=np.float32)

        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10, max_iter=300)
        labels = kmeans.fit_predict(fp_matrix)
        cluster_ids = labels + 1  # 1-indexed to match agglomerative output

        # Build pairwise distance array for heatmap
        dist = []
        n = len(fps)
        for i in range(n):
            for j in range(i + 1, n):
                d = self._compute_distance(fps[i], fps[j], metric)
                dist.append(d)
        dist_array = np.array(dist, dtype=float)

        return {
            "names": names,
            "smiles": smiles,
            "Z": None,           # no linkage matrix for k-means
            "dist_array": dist_array,
            "cluster_ids": cluster_ids,
            "n_clusters": n_clusters,
            "inertia": float(kmeans.inertia_),
        }

    def get_clusters_dict(self, result):
        d = {}
        for name, cid in zip(result["names"], result["cluster_ids"]):
            d.setdefault(int(cid), []).append(name)
        return d

    def plot_dendrogram(self, result):
        fig, ax = plt.subplots(figsize=(12, 6))
        dendrogram(result["Z"], labels=result["names"], leaf_rotation=90, ax=ax)
        ax.set_title("Glycan Clustering Dendrogram")
        ax.set_ylabel("Distance")
        fig.tight_layout()
        return fig

    def plot_heatmap(self, result):
        square = squareform(result["dist_array"])
        fig, ax = plt.subplots(figsize=(10, 8))
        sns.heatmap(square, xticklabels=result["names"], yticklabels=result["names"], cmap="viridis", square=True)
        ax.set_title("Pairwise Glycan Distance Heatmap")
        fig.tight_layout()
        return fig

def detect_singleton_outliers(result):
    """Detect outliers as singleton clusters + mean distance validation.
    Returns:
        singletons (list[str])
        singleton_stats (list[dict])
    """
    names = result["names"]
    clusters = {}
    for name, cid in zip(result["names"], result["cluster_ids"]):
        clusters.setdefault(int(cid), []).append(name)

    # Reconstruct full distance matrix
    dist_matrix = squareform(result["dist_array"])
    
    singletons = []
    singleton_stats = []
    
    for cid, members in clusters.items():
        if len(members) == 1:
            name = members[0]
            idx = names.index(name)
            distances = dist_matrix[idx]
            mask = distances > 0
            mean_dist = float(distances[mask].mean()) if mask.any() else 0.0
            
            singletons.append(name)
            singleton_stats.append({
                "name": name,
                "cluster_id": cid,
                "mean_distance": round(mean_dist, 4)
            })
    
    return singletons, singleton_stats

def normalize_glycans_with_iupac(glycans_in):
    if not isinstance(glycans_in, list):
        raise ValueError("`glycans` must be a list of objects")

    normalized = []
    iupac_list = []
    iupac_positions = []

    for idx, g in enumerate(glycans_in):
        if not isinstance(g, dict):
            raise ValueError("Each glycan must be an object/dict")

        name = (g.get("name") or "").strip()
        smiles = (g.get("smiles") or "").strip() or None
        iupac = (g.get("iupac") or g.get("iupac_condensed") or "").strip() or None

        if not name:
            name = iupac or f"Glycan_{idx+1}"

        if smiles:
            normalized.append({"name": name, "smiles": smiles, "iupac": iupac or ""})
        elif iupac:
            normalized.append({"name": name, "smiles": None, "iupac": iupac})
            iupac_list.append(iupac)
            iupac_positions.append(len(normalized) - 1)
        else:
            raise ValueError(f"Glycan #{idx+1} ('{name}') must have either 'smiles' or 'iupac'")

    # Convert all IUPAC strings in one batch
    if iupac_list:
        try:
            smiles_list = IUPAC_to_SMILES(iupac_list)
        except Exception as e:
            raise ValueError(f"Failed in IUPAC_to_SMILES for IUPAC list {iupac_list}: {e}") from e

        if len(smiles_list) != len(iupac_list):
            raise ValueError(f"IUPAC_to_SMILES returned {len(smiles_list)} SMILES for {len(iupac_list)} IUPAC strings")

        for pos, smi, iupac in zip(iupac_positions, smiles_list, iupac_list):
            if not smi:
                raise ValueError(f"Cannot convert IUPAC '{iupac}' for {normalized[pos]['name']}: got empty SMILES")
            normalized[pos]["smiles"] = smi
            normalized[pos]["iupac"] = iupac

    # Final sanity check
    for g in normalized:
        if not g["smiles"]:
            raise ValueError(f"Missing SMILES for glycan '{g['name']}' after normalization")

    return normalized

@cluster_api.post("/api/cluster/run")
def run_cluster(request: ClusterRequest):
    try:
        # Convert Pydantic models to dicts for processing
        glycans = [g.dict() for g in request.glycans]
        distance_threshold = request.distance_threshold
        linkage_method = request.linkage_method
        metric = request.metric
        fingerprint_type = request.fingerprint_type
        radius = request.radius
        n_bits = request.n_bits
        mode = request.mode
        clustering_method = request.clustering_method
        n_clusters_kmeans = request.n_clusters
        
        if not glycans:
            raise HTTPException(status_code=400, detail="No glycans provided")

        # Normalize input & convert IUPAC → SMILES as needed
        glycans_normalized = normalize_glycans_with_iupac(glycans)

        analyzer = GlycanClusterAnalyzer(
            fingerprint_type=fingerprint_type,
            radius=radius,
            n_bits=n_bits,
        )

        # ── Choose clustering method ──────────────────────────────────
        if clustering_method == "kmeans":
            k = n_clusters_kmeans if n_clusters_kmeans and n_clusters_kmeans >= 2 else 3
            result = analyzer.cluster_glycans_kmeans(
                glycans_normalized,
                n_clusters=k,
                metric=metric,
            )
        else:
            # Default: agglomerative
            result = analyzer.cluster_glycans_from_dicts(
                glycans_normalized,
                distance_threshold=distance_threshold,
                linkage_method=linkage_method,
                metric=metric,
            )

        # ── Dendrogram (agglomerative only) ──────────────────────────
        dendrogram_base64 = None
        if clustering_method != "kmeans" and result.get("Z") is not None:
            fig1 = analyzer.plot_dendrogram(result)
            buf1 = io.BytesIO()
            fig1.savefig(buf1, format="png", dpi=300)
            buf1.seek(0)
            dendrogram_base64 = base64.b64encode(buf1.read()).decode("utf-8")
            plt.close(fig1)

        fig2 = analyzer.plot_heatmap(result)
        buf2 = io.BytesIO()
        fig2.savefig(buf2, format="png", dpi=300)
        buf2.seek(0)
        heatmap_base64 = base64.b64encode(buf2.read()).decode("utf-8")
        plt.close(fig2)

        clusters = analyzer.get_clusters_dict(result)

        singletons = []
        singleton_stats = []
        threshold_curve = []
        elbow_base64 = None

        # OUTLIERS MODE
        if mode == "outliers":
            singletons, singleton_stats = detect_singleton_outliers(result)

        # OPTIMAL_K MODE (agglomerative only)
        if mode == "optimal_k" and clustering_method != "kmeans":
            print("Running optimal_k threshold sweep")
            raw_thresholds = request.thresholds
            if raw_thresholds is None:
                thresholds = [round(t, 2) for t in np.arange(0.1, 0.8, 0.1)]
            else:
                thresholds = [float(t) for t in raw_thresholds]

            sweep_results = []
            for thr in thresholds:
                r_thr = analyzer.cluster_glycans_from_dicts(
                    glycans_normalized,
                    distance_threshold=thr,
                    linkage_method=linkage_method,
                    metric=metric,
                )
                sweep_results.append(
                  {"threshold": float(thr), "n_clusters": int(r_thr["n_clusters"])}
                )

            threshold_curve = sweep_results
            print("threshold_curve:", threshold_curve)

            df = pd.DataFrame(sweep_results)
            fig, ax = plt.subplots(figsize=(6, 4))
            ax.plot(df["threshold"], df["n_clusters"], marker="o")
            ax.set_xlabel("Distance threshold")
            ax.set_ylabel("Number of clusters")
            ax.set_title("Cluster count vs threshold")
            ax.grid(True, alpha=0.3)
            fig.tight_layout()

            buf_elbow = io.BytesIO()
            fig.savefig(buf_elbow, format="png", dpi=300)
            buf_elbow.seek(0)
            elbow_base64 = base64.b64encode(buf_elbow.read()).decode("utf-8")
            plt.close(fig)
            print("elbow_base64 length:", len(elbow_base64))

        # Build response
        response_data = {
            "status": "success",
            "mode": mode,
            "clustering_method": clustering_method,
            "heatmap": heatmap_base64,
            "n_clusters": int(result["n_clusters"]),
            "clusters": clusters,
            "glycowork_similarity_available": _GLYCOWORK_SIMILARITY_AVAILABLE,
            "params": {
                "clustering_method": clustering_method,
                "distance_threshold": distance_threshold,
                "linkage_method": linkage_method,
                "n_clusters": result["n_clusters"],
                "metric": metric,
                "fingerprint_type": fingerprint_type,
                "radius": radius,
                "n_bits": n_bits,
            },
        }

        # Only include dendrogram when it was actually generated (agglomerative)
        if dendrogram_base64 is not None:
            response_data["dendrogram"] = dendrogram_base64

        if singletons:
            response_data["singletons"] = singletons
            response_data["singleton_stats"] = singleton_stats

        if threshold_curve:
            response_data["threshold_curve"] = threshold_curve
        if elbow_base64 is not None:
            response_data["elbow_plot"] = elbow_base64

        print("Returning keys:", list(response_data.keys()))
        # Return plain dict to avoid Pydantic Optional[str] coercion issues with None
        return response_data

    except Exception as e:
        print("ERROR in cluster API:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))