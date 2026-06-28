# GlycanBench Backend

FastAPI-based backend for GlycanBench — a full-stack glycomics and glycobiology research platform.

## Overview

The backend provides 17 REST API endpoints covering glycan structure creation, visualization, analysis, alignment, clustering, immunogenicity prediction, format conversion, and an AI-powered research assistant. It runs on FastAPI + Uvicorn at port 5000.

---

## API Modules

| Module | File | Endpoints |
|--------|------|-----------|
| **3D Visualization** | `visualize_api.py` | `POST /api/visualize` |
| **2D Drawing** | `draw_api.py` | `POST /api/draw` |
| **Format Conversion** | `convert_api.py` | `POST /api/convert` |
| **Biosynthetic Networks** | `network_api.py` | `GET /api/network-parameters`, `POST /api/network` |
| **Monosaccharide Characterization** | `characterize_api.py` | `POST /api/characterize` |
| **Glycan Insight** | `insight_api.py` | `POST /api/glycan_insight` |
| **Molecule Descriptors** | `descriptor_api.py` | `POST /api/descriptor` |
| **Motif Mutation** | `motif_api.py` | `POST /api/motif/mutate`, `/small`, `/find` |
| **Sequence Alignment** | `seq_align_api.py` | `POST /api/align` |
| **Fingerprint Comparison** | `compare_api.py` | `POST /api/compare_glycans` |
| **Clustering** | `cluster_api.py` | `POST /api/cluster/run` |
| **KEGG Pathways** | `pathway_api.py` | `GET /api/pathway`, `/search_pathways`, `/proxy_image` |
| **MPNN Prediction** | `model_api.py` | `POST /api/validate`, `POST /api/predict` |
| **Species Data** | `species_api.py` | `GET /api/download` |
| **AI Chat** | `chat/router.py` | `POST /api/GlycomicsChat` + helper endpoints |

---

## Key Implementations

### 3D Conformer Generation (`visualize_api.py`)
Tiered optimization pipeline for IUPAC → 3D MDL Molfile:
1. **ETKDGv3** — RDKit distance geometry with chirality enforcement and small-ring torsion corrections (beneficial for pyranose rings). Falls back to classic ETKDG if embedding fails.
2. **MMFF94s** — MMFF static variant, better suited to cyclic systems. Up to 2×2000 minimization iterations.
3. **UFF fallback** — used when MMFF94s cannot be set up for the molecule.

### Sequence Alignment (`seq_align_api.py`)
- BioPython `PairwiseAligner` in global (Needleman-Wunsch) mode
- Default scoring: **GLYSUM.xlsx** — glycan-specific substitution matrix (Alocci et al., *Glycobiology*, 2015)
- Tokenizes IUPAC into alternating [monosaccharide, linkage] arrays
- Fuzzy matching via `difflib.get_close_matches` (cutoff 0.85) for near-exact names
- Unknown sugars → `UNK1`, unknown linkages → `UNK2` (zero substitution score)
- Optional custom match/mismatch/gap scoring

### Clustering (`cluster_api.py`)
- **Methods**: Agglomerative (SciPy `linkage`/`fcluster`) and K-means (`sklearn.cluster.KMeans`)
- **Fingerprints**: Morgan (R2/R3), Atom Pair, Topological Torsion, RDKit path
- **Distance metrics**: Tanimoto, Dice, Cosine, Euclidean, and **glycowork graph similarity** (`glycowork.motif.graph.compare_glycans()`) — a glycan-native metric that bypasses fingerprints entirely and operates on the original IUPAC strings
- `glycowork_similarity_available` flag in the response indicates whether the glycowork metric is usable
- IUPAC strings are preserved through `normalize_glycans_with_iupac()` for glycan-native metric support

### KEGG Pathway API (`pathway_api.py`)
- `GET /api/pathway` — tries `rest.kegg.jp/get/{id}/image`, falls back to direct PNG URL pattern
- `GET /api/search_pathways` — proper FastAPI `Query` parameter (`min_length=3`), raises `HTTPException` (not Flask-style tuples)
- `GET /api/proxy_image` — server-side CORS bypass for downloading pathway images

### AI Chat (`chat/`)
- LLM: Groq `openai/gpt-oss-120b` (temperature=0.1, top_p=0.9, max_tokens=2048)
- **LLM-based tool router** (`_llm_route_tools`): sends a compact JSON-routing prompt to the same model to select which specific tools (PubMed, ArXiv, GlyTouCan DB, Structure Analysis, Synthesis) are relevant to the query
- **Keyword fallback** (`_keyword_route_tools`): activated automatically if the LLM routing call fails
- **GlyTouCan auto-detection**: regex `G\d{5}[A-Z]{2}` triggers database lookup fetching WURCS, IUPAC, mass, formula
- **Question-type analysis**: classifies query into 8 categories and injects as prompt context
- **Confidence scoring**: heuristic based on response length, scientific term density, quantitative content, evidence used

### MPNN Immunogenicity Predictor (`model_api.py`)
- Glycoword representation: 5-token sliding windows (sugar–bond–sugar–bond–sugar, step 2)
- Graph: bidirectional sequential chain (nodes = glycoword indices)
- Architecture: Embedding(|vocab|+1, 64) → 2× MPNNLayer + BatchNorm → global_mean_pool → MLP 64→32→1 → sigmoid
- Rule-based parallel flags: AlphaGal (Gal-α1-3-Gal), NonHumanSialicAcid (Neu5Gc), ComplexNGlycan core

---

## Technology Stack

| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.115.6 | REST API framework |
| uvicorn | 0.32.1 | ASGI server |
| pydantic | 2.12.4 | Data validation |
| torch | 2.9.1 | MPNN inference |
| torch-geometric | 2.7.0 | Graph Neural Networks |
| rdkit | 2024.9.6 | Cheminformatics, fingerprints, ETKDGv3, MMFF94s |
| glycowork | 1.5.0 | Glycan processing, biosynthesis, graph similarity |
| glypy | 1.0.17 | GlycoCT / WURCS format parsing |
| biopython | 1.85 | GLYSUM-based sequence alignment |
| langchain-groq | 1.1.1 | Groq LLM integration |
| langchain-community | 0.4.1 | PubMed & ArXiv tools |
| scipy | — | Hierarchical clustering |
| scikit-learn | — | K-means clustering |
| seaborn / matplotlib | — | Dendrogram and heatmap generation |
| numpy | 1.24.3 | Numerical computing |
| pandas | 2.0.3 | Data manipulation |
| httpx | 0.28.1 | Async HTTP (GlyTouCan API) |
| requests | 2.31.0 | Sync HTTP (KEGG proxy) |
| python-dotenv | 1.0.0 | Environment configuration |

---

## Project Structure

```
Backend/
├── main.py                    # FastAPI app, router registration, CORS
├── start_server.py            # Server startup helper
├── requirements.txt
├── .env                       # GROQ_API_KEY and other secrets
│
├── api/
│   ├── visualize_api.py       # ETKDGv3 + MMFF94s + UFF 3D pipeline
│   ├── draw_api.py            # GlycoDraw SNFG renderer
│   ├── convert_api.py         # glycowork + glypy format conversion
│   ├── network_api.py         # glycowork biosynthetic network
│   ├── characterize_api.py    # characterize_monosaccharide wrapper
│   ├── insight_api.py         # get_insight + GlyTouCan accession resolver
│   ├── descriptor_api.py      # RDKit descriptors + fingerprints
│   ├── motif_api.py           # stochastic glycan mutagenesis
│   ├── seq_align_api.py       # GLYSUM Needleman-Wunsch alignment
│   ├── compare_api.py         # multi-fingerprint Tanimoto
│   ├── cluster_api.py         # agglomerative + K-means + glycowork metric
│   ├── pathway_api.py         # KEGG REST proxy (FastAPI Query params)
│   ├── model_api.py           # MPNN immunogenicity classifier
│   ├── species_api.py         # species CSV download
│   └── chat/
│       ├── router.py          # /api/GlycomicsChat + tool/health endpoints
│       ├── llm.py             # Groq chain, system prompt, output cleaner
│       ├── tools.py           # LLM router, keyword fallback, PubMed/ArXiv
│       ├── glycan_utils.py    # GlyTouCan lookup, WURCS/IUPAC extraction
│       ├── capabilities.py    # Tool capability query detection
│       ├── config.py          # API keys, MAX_TOOL_RESULTS_LENGTH, ErrorCode
│       └── models.py          # ChatRequest, ChatResponse, GlycanData
│
├── models/                    # Trained PyTorch model checkpoints
│   ├── Models_MPNN_immunoClassifier_final.pt   ← active
│   ├── GAT_immunoClassifier_large.pt
│   ├── GIN_immunoClassifier_large.pt
│   └── LSTM_immunoClassifier_large.pt
│
├── dataset/
│   ├── GLYSUM.xlsx                # Glycan substitution matrix
│   ├── merged_glycan_dataset.csv
│   ├── monosaccharides_counts.csv
│   └── species_data.csv
│
└── vocab/
    └── glycoword_vocab.json       # Glycoword vocabulary for MPNN
```

---

## Setup

### Prerequisites
- Python 3.10+
- A [Groq API key](https://console.groq.com/)

### Install & Run

```bash
cd Backend

# Install dependencies
pip install -r requirements.txt

# Create .env
echo "GROQ_API_KEY=your_key_here" > .env

# Start server
python start_server.py
# OR
uvicorn main:app --host 127.0.0.1 --port 5000 --reload
```

Swagger UI: `http://127.0.0.1:5000/docs`  
ReDoc: `http://127.0.0.1:5000/redoc`  
Health check: `http://127.0.0.1:5000/api/health`

---

## Environment Variables

```env
# Required
GROQ_API_KEY=your_groq_api_key_here

# Optional (defaults shown)
MAX_TOOL_RESULTS_LENGTH=3000
DEFAULT_TIMEOUT=30
LOG_LEVEL=INFO
```

---

## Selected API Examples

### Predict immunogenicity
```bash
curl -X POST http://127.0.0.1:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"sequence": "Gal(a1-3)Gal(b1-4)GlcNAc"}'
```

### Align two glycan sequences
```bash
curl -X POST http://127.0.0.1:5000/api/align \
  -H "Content-Type: application/json" \
  -d '{"sequence1": "GlcNAc(b1-4)Gal", "sequence2": "GlcNAc(b1-4)Man", "use_custom_scoring": false}'
```

### Cluster with glycowork graph similarity
```bash
curl -X POST http://127.0.0.1:5000/api/cluster/run \
  -H "Content-Type: application/json" \
  -d '{
    "glycans": [{"name":"Glc","iupac":"Glc"}, {"name":"Gal","iupac":"Gal"}, {"name":"Man","iupac":"Man"}],
    "metric": "glycowork",
    "clustering_method": "agglomerative",
    "mode": "standard"
  }'
```

### Chat with LLM tool routing
```bash
curl -X POST http://127.0.0.1:5000/api/GlycomicsChat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the role of sialic acid in immune evasion?", "use_literature": true}'
```

---

## Production Deployment

```bash
# Multi-worker production
uvicorn main:app --host 0.0.0.0 --port 5000 --workers 4

# Or with Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:5000
```

Update CORS for production:
```python
allow_origins=["https://yourdomain.com"]
```

---

## License

MIT License. For academic non-commercial use.
