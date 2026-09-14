
[![DOI](https://zenodo.org/badge/1012488089.svg)](https://doi.org/10.5281/zenodo.22756268)


# GlycanBench

> **A unified resource for working with glycans**

🌐 **Live Platform:** [https://glycanbench.sastra.edu/](https://glycanbench.sastra.edu/)  
📖 **API Docs:** `http://127.0.0.1:5000/docs` (when running locally)

GlycanBench is a full-stack integrated web platform for glycan analysis — spanning structure building, visualization, analysis, alignment, clustering, property prediction, and AI-powered literature exploration in glycobiology.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [ML Models](#ml-models)
- [Datasets](#datasets)
- [Citation](#citation)
- [Authors](#authors)

---

## Features

### 🏗️ Create
| Tool | Description |
|------|-------------|
| **Glycan Molecule** | Click-to-build glycan sequence constructor with grammar enforcement. Simultaneously generates SNFG 2D image, format conversions (IUPAC/SMILES/GlycoCT/WURCS), and a 3D conformer (ETKDGv3 + MMFF94s + UFF pipeline) rendered in 3Dmol.js. |
| **Biosynthetic Networks** | Interactive Cytoscape.js biosynthetic network from user-supplied glycan sets. Configurable PTMs, reducing-end roots, and edge types (monolink / full_reaction / enzyme). Supports dark/light mode, node search, PNG export. |
| **Format Converter** | Interconvert glycan representations: IUPAC ↔ WURCS ↔ GlycoCT ↔ SMILES. Unsupported paths (IUPAC → GlycoCT/WURCS) are surfaced explicitly as orange notices rather than silent failures. |

### 👁️ Visualize
| Tool | Description |
|------|-------------|
| **2D Draw** | SNFG-style 2D glycan structure rendering with optional per-motif color highlighting via glycowork `GlycoDraw`. |
| **3D Representation** | On-demand 3D conformer from any IUPAC string using a tiered optimization pipeline: ETKDGv3 (chirality enforcement, small-ring torsion corrections) → MMFF94s (up to 2×2000 iterations) → UFF fallback. Rendered in 3Dmol.js with four display styles and screenshot export. |
| **KEGG Pathway View** | Live KEGG pathway maps with server-side CORS proxy, debounced autocomplete search (FastAPI `Query` parameter, min 3 chars), and direct PNG download. Ten curated glycan pathway examples provided. |

### 🔬 Analyse
| Tool | Description |
|------|-------------|
| **Monosaccharide** | Taxonomic-rank-stratified occurrence charts for any monosaccharide, with configurable rank, focus, modification toggle, and frequency threshold. Powered by `glycowork.motif.analysis.characterize_monosaccharide()`. |
| **Glycan Insight** | Retrieve full biological context — species, phyla, motifs, cell lines, disease associations, glycan class, GlyTouCan ID — from a single IUPAC string or GlyTouCan accession. Dashboard with Chart.js Doughnut (phyla), species tag cloud, disease table. |
| **Molecule Descriptors** | 17 physicochemical descriptors, elemental composition with O/N ratio, 5 glycan-specific SMARTS motif counts (pyranose, furanose, N-acetyl, carboxyl, sulfate), and 5 × 2048-bit fingerprints (Morgan R2/R3, Atom Pair, Torsion, RDKit). CSV export and PubChem link. |
| **Motif Mutation** | Stochastic in-silico glycan mutagenesis with three intensity modes (normal / moderate / extreme). Generates configurable numbers of mutant sequences, extracts pentamer glycoword motifs, and plots frequency distribution as a Chart.js bar chart. |

### 🔗 Compare
| Tool | Description |
|------|-------------|
| **Two Glycans** | Side-by-side Tanimoto similarity across five 2048-bit fingerprint types (Morgan R2/R3, Atom Pair, Torsion, RDKit). Per-fingerprint hover tooltips explain what each encodes. |

### 📐 Align
| Tool | Description |
|------|-------------|
| **Glycan Sequences** | Global Needleman-Wunsch alignment using the **GLYSUM** glycan-specific substitution matrix or custom match/mismatch/gap scoring. Fuzzy token resolution (cutoff 0.85) handles near-exact monosaccharide names. Outputs columnar alignment, score, and percent identity. TXT export. |

### 📊 Cluster
| Tool | Description |
|------|-------------|
| **Cluster Glycans** | Cluster ≥3 glycans using agglomerative (hierarchical) or K-means methods. Configurable fingerprint type, distance metric (Tanimoto / Dice / Cosine / Euclidean / **glycowork graph similarity**), and linkage method. Outputs dendrogram, heatmap, and CSV of assignments. |
| **Optimize Clusters** | Threshold sweep for agglomerative clustering produces an elbow plot (cluster count vs. distance threshold) to guide parameter selection. |
| **Detect Outliers** | Singleton-cluster detection with mean pairwise distance scoring. Singletons with distance > 0.45 are flagged as STRONG OUTLIERS. |

### 🔮 Predict
| Tool | Description |
|------|-------------|
| **Immunogenicity** | MPNN (Message Passing Neural Network) predicts immunogenicity from IUPAC-condensed sequences. Glycoword-graph representation, vocabulary analysis, rule-based motif flags (AlphaGal, Neu5Gc, complex N-glycan core). Animated probability bar, confidence badge, JSON download. |

### 💬 Chat
| Tool | Description |
|------|-------------|
| **GlycomicsChat** | Glycomics-domain-enforced AI assistant (Groq `openai/gpt-oss-120b`). **LLM-based tool router** selects PubMed, ArXiv, GlyTouCan DB, Structure Analysis, or Synthesis tools per query, with keyword-heuristic fallback. Question-type analysis and heuristic confidence scoring. Structured panels for resolved GlyTouCan accession data (WURCS, IUPAC, mass, formula). |

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.115.6 | REST API framework |
| uvicorn | 0.32.1 | ASGI server |
| pydantic | 2.12.4 | Data validation |
| torch | 2.9.1 | Deep learning (MPNN inference) |
| torch-geometric | 2.7.0 | Graph Neural Networks |
| rdkit | 2024.9.6 | Cheminformatics, fingerprints, 3D conformers |
| glycowork | 1.5.0 | Glycan processing, biosynthetic networks, similarity |
| glypy | 1.0.17 | GlycoCT / WURCS format conversion |
| biopython | 1.85 | GLYSUM-based sequence alignment |
| langchain-groq | 1.1.1 | Groq LLM integration |
| langchain-community | 0.4.1 | PubMed & ArXiv search tools |
| scipy | — | Hierarchical clustering |
| scikit-learn | — | K-means clustering |
| seaborn / matplotlib | — | Dendrogram and heatmap plots |
| numpy | 1.24.3 | Numerical computing |
| pandas | 2.0.3 | Data handling |
| httpx | 0.28.1 | Async HTTP (GlyTouCan API calls) |
| requests | 2.31.0 | Sync HTTP (KEGG API proxy) |
| python-dotenv | 1.0.0 | Environment configuration |

> `matplotlib`, `scipy`, `scikit-learn`, `seaborn`, and `openpyxl` (needed for `pandas.read_excel` on `GLYSUM.xlsx`) are imported at runtime but **not pinned in `requirements.txt`** — currently satisfied transitively. Pin them explicitly if setting up a clean environment.

### Frontend
| Package | Purpose |
|---------|---------|
| React 19 + TypeScript | UI framework |
| Vite (rolldown-vite fork) | Build tool |
| Tailwind CSS v4 | Styling (CSS-first config, no `tailwind.config.js`) |
| Framer Motion | Animations |
| 3Dmol.js + NGL | 3D molecular visualization |
| Cytoscape.js | Biosynthetic network graph |
| Chart.js + react-chartjs-2 | Doughnut & bar charts |
| react-zoom-pan-pinch | KEGG pathway interactive viewer |
| React Router v7 | Client-side routing |
| Axios | HTTP requests |
| React Icons / lucide-react | Icon libraries |

> **Node.js requirement:** rolldown-vite needs Node **`^20.19.0` or `>=22.12.0`**. On Windows, if you hit `Cannot find native binding` from rolldown after `npm install`, it's almost always an old Node version silently skipping the platform-specific optional dependency — upgrade Node (e.g. via `nvm-windows`) and reinstall (`rm -rf node_modules package-lock.json && npm install`), don't just retry the install.

---

## Project Structure

```
GlycanBench/
├── Backend/
│   ├── main.py                        # FastAPI app entry point (port 5000)
│   ├── requirements.txt               # Python dependencies
│   ├── start_server.py                # Server startup script
│   ├── api/
│   │   ├── model_api.py               # POST /api/validate, /api/predict (MPNN)
│   │   ├── cluster_api.py             # POST /api/cluster/run (glycowork metric supported)
│   │   ├── seq_align_api.py           # POST /api/align (GLYSUM + custom scoring)
│   │   ├── compare_api.py             # POST /api/compare_glycans
│   │   ├── descriptor_api.py          # POST /api/descriptor
│   │   ├── visualize_api.py           # POST /api/visualize (ETKDGv3+MMFF94s+UFF)
│   │   ├── draw_api.py                # POST /api/draw (SNFG + motif highlight)
│   │   ├── characterize_api.py        # POST /api/characterize
│   │   ├── convert_api.py             # POST /api/convert
│   │   ├── motif_api.py               # POST /api/motif/mutate, /small, /find
│   │   ├── network_api.py             # GET /api/network-parameters, POST /api/network
│   │   ├── pathway_api.py             # GET /api/pathway, /search_pathways, /proxy_image
│   │   ├── insight_api.py             # POST /api/glycan_insight
│   │   ├── species_api.py             # GET /api/download
│   │   └── chat/
│   │       ├── router.py              # POST /api/GlycomicsChat + helper endpoints
│   │       ├── llm.py                 # Groq LLM chain (glycomics system prompt)
│   │       ├── tools.py               # LLM router + PubMed/ArXiv tools
│   │       ├── glycan_utils.py        # GlyTouCan API integration
│   │       ├── capabilities.py        # Tool capability detection
│   │       ├── config.py              # API keys, constants, enums
│   │       └── models.py              # Pydantic request/response models
│   ├── models/
│   │   ├── Models_MPNN_immunoClassifier_final.pt   # Active MPNN model
│   │   ├── GAT_immunoClassifier_large.pt
│   │   ├── GIN_immunoClassifier_large.pt
│   │   └── LSTM_immunoClassifier_large.pt
│   ├── dataset/
│   │   ├── GLYSUM.xlsx                # Glycan substitution matrix (Alocci et al. 2015)
│   │   ├── merged_glycan_dataset.csv
│   │   ├── monosaccharides_counts.csv # Monosaccharide pool for mutation sampling
│   │   └── species_data.csv
│   ├── vocab/
│   │   └── glycoword_vocab.json       # Glycoword vocabulary for MPNN
│   └── tests/                         # Ad-hoc integration/diagnostic scripts (not pytest)
│       ├── test_api_integration.py
│       ├── test_dependencies.py
│       ├── test_endpoint_direct.py
│       ├── test_endpoint_fix.py
│       ├── test_live_integration.py
│       ├── test_working_endpoints.py
│       └── diagnose_api.py
│
├── Frontend/
│   └── src/
│       ├── App.tsx                    # Router + 20 route definitions
│       ├── Components/
│       │   ├── Home.tsx
│       │   ├── Header.tsx
│       │   ├── NavBar.tsx             # Desktop mega-menu + mobile sidebar
│       │   ├── Footer.tsx
│       │   └── Logo.tsx
│       └── Pages/
│           ├── AboutUs.tsx
│           ├── Help.tsx
│           ├── Predict/Prediction/    # MPNN immunogenicity predictor
│           ├── Predict/Chat/          # GlycomicsChat UI
│           ├── Analyze/               # Characterize, Descriptors, MotifMutation,
│           │                          #   Visualization, GlycanDrawer, Compare,
│           │                          #   Cluster (×3), FormatConverter, PathwayViewer
│           ├── Align/SequenceAlignment/
│           ├── Create/GlycanMolecule/
│           ├── Create/BiosyntheticNetworks/  # + 9 helper components (controls, graph, settings)
│           └── Browse/
│               ├── GlycanInsight/
│               └── ChatGlyco/         # not routed — unused, kept on disk
│
├── STATE_OF_THE_ART.md                # Tool-by-tool scientific comparison table
├── STATE_OF_THE_ART.docx              # Word version of the above
└── README.md                          # This file
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js `^20.19.0` or `>=22.12.0` (required by rolldown-vite — see [Tech Stack](#tech-stack))
- A [Groq API key](https://console.groq.com/) for GlycomicsChat

### Backend

```bash
cd Backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Create a .env file with:
#   GROQ_API_KEY=your_key_here
#   LANGCHAIN_API_KEY=your_key_here          # optional, for LangChain tracing
#   CORS_ALLOWED_ORIGINS=http://localhost:5173  # optional, comma-separated; defaults to localhost:5173

# Start the server
python start_server.py
# OR
uvicorn main:app --host 127.0.0.1 --port 5000 --reload
```

Server: `http://127.0.0.1:5000`  
Swagger UI: `http://127.0.0.1:5000/docs`  
ReDoc: `http://127.0.0.1:5000/redoc`

### Frontend

```bash
cd Frontend

npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build
```

The frontend connects to `http://localhost:5000` in development and uses relative paths in production.

---

## API Reference

> Full request/response schemas: `http://127.0.0.1:5000/docs` (Swagger). Tables below are a quick reference, kept in sync with the router source.

### Prediction
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/validate` | Validate IUPAC glycan sequence against glycoword vocabulary |
| `POST` | `/api/predict` | MPNN immunogenicity prediction |

### Clustering
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/cluster/run` | Clustering — mode: `standard`, `optimal_k`, `outliers`; metric includes `glycowork` graph similarity |

### Alignment & Comparison
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/align` | Global pairwise alignment (GLYSUM or custom scoring) |
| `POST` | `/api/compare_glycans` | Tanimoto similarity across five fingerprint types |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/descriptor` | Molecular descriptors + fingerprints |
| `POST` | `/api/characterize` | Monosaccharide characterization plot |
| `POST` | `/api/glycan_insight` | Biological context (species, motifs, diseases) |
| `POST` | `/api/motif/mutate` | Random motif mutagenesis (returns motif frequency counts + mutated labels) |
| `POST` | `/api/motif/small` | Flattened sugar/linkage token string for a sequence |
| `POST` | `/api/motif/find` | Extract pentamer (5-token sliding-window) glycoword motifs |

### Visualization
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/visualize` | IUPAC → 3D MDL Molfile (ETKDGv3 + MMFF94s + UFF) |
| `POST` | `/api/draw` | IUPAC → SNFG 2D image with motif highlight (base64 PNG) |
| `GET`  | `/api/pathway` | KEGG pathway image URL (REST + direct PNG fallback) |
| `GET`  | `/api/search_pathways` | Search KEGG pathways (FastAPI Query param, min 3 chars) |
| `GET`  | `/api/proxy_image` | Server-side KEGG image download (CORS bypass) |

### Creation
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/convert` | Format conversion (IUPAC / WURCS / GlycoCT / SMILES) |
| `POST` | `/api/network` | Build biosynthetic network (Cytoscape.js elements) |
| `GET`  | `/api/network-parameters` | Available PTMs, roots, edge types |

### Species / Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/download` | Download `glycowork` species dataset filtered by `species` query param, as CSV |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/GlycomicsChat` | AI glycomics assistant with LLM-based tool routing (PubMed / ArXiv / GlyTouCan) |
| `GET`  | `/api/health` | Health check + LLM connectivity test |
| `GET`  | `/api/tools/capabilities` | Tool descriptions and examples |
| `GET`  | `/api/tools/capabilities/examples` | Example questions per tool |
| `POST` | `/api/tools/capabilities/{tool_name}` | Detailed info for one specific tool |
| `GET`  | `/api/tools/categories` | Tools grouped by category (Literature, Databases) |
| `GET`  | `/api/tools/categories/{category_name}` | Tools within one category |
| `POST` | `/api/validate-accession` | Validate a GlyTouCan/WURCS/IUPAC accession string |
| `GET`  | `/api/test-tools` | Connectivity test for PubMed/ArXiv integrations |
| `POST` | `/api/test-capability-query` | Debug endpoint: tests capability-query classification |
| `POST` | `/api/test-intelligent-selection` | Debug endpoint: tests LLM/keyword tool-routing logic |

> `Backend/api/chat_api.py` is an unused re-export shim — `main.py` mounts `api/chat/router.py` directly.

---

## Frontend Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page |
| `/GlycanMolecule` | GlycanMolecule | Click-to-build 3D molecule |
| `/BiosyntheticNetworks` | BiosyntheticNetworks | Biosynthetic network builder |
| `/GlycanFormatConverter` | GlycanFormatConverter | Format conversion |
| `/GlycanDrawer` | GlycanDrawer | 2D SNFG drawing |
| `/visualize` | VisualizePage | 3D structure viewer |
| `/pathwayMaps` | PathwayViewer | KEGG pathway maps |
| `/characterize` | CharacterizeForm | Monosaccharide analysis |
| `/GlycanInsight` | GlycanInsight | Biological context lookup |
| `/DescriptorCalculator` | DescriptorCalculator | Molecule descriptors |
| `/MotifMutation` | MotifMutation | Motif mutation simulator |
| `/CompareGlycans` | CompareGlycans | Fingerprint comparison |
| `/sequenceAlignment` | SequenceAlignment | GLYSUM-based alignment |
| `/cluster/multiple` | ClusterMultipleGlycans | Cluster ≥3 glycans |
| `/cluster/optimize` | OptimalClusters | Find optimal cluster count |
| `/cluster/outliers` | DetectOutlierGlycans | Detect structural outliers |
| `/prediction` | Prediction | MPNN immunogenicity predictor |
| `/GlycomicsChat` | GlycomicsChat | AI glycomics chat |
| `/aboutus` | AboutUs | About the platform |
| `/help` | Help | Documentation |

---

## ML Models

The immunogenicity prediction uses a **Message Passing Neural Network (MPNN)** built with PyTorch Geometric.

### Architecture
```
Embedding (|vocab|+1, 64)
→ MPNNLayer 64→64 + BatchNorm + ReLU
→ MPNNLayer 64→64 + BatchNorm + ReLU
→ global_mean_pool
→ Linear 64→32 + ReLU + Dropout(0.5)
→ Linear 32→1 → sigmoid
```
Threshold 0.5 → Immunogenic / Non-Immunogenic.

### Input Representation
IUPAC sequences are tokenized into alternating [sugar, linkage] arrays. Consecutive 5-token windows (sugar–bond–sugar–bond–sugar, step 2) form **glycowords** that are indexed against `glycoword_vocab.json`. Tokens are nodes in a bidirectional sequential chain graph.

### Available Model Files
| File | Architecture | Status |
|------|-------------|--------|
| `Models_MPNN_immunoClassifier_final.pt` | MPNN | **Active (deployed)** |
| `GAT_immunoClassifier_large.pt` | Graph Attention Network | Stored |
| `GIN_immunoClassifier_large.pt` | Graph Isomorphism Network | Stored |
| `LSTM_immunoClassifier_large.pt` | LSTM | Stored |

---

## Datasets

| File | Description |
|------|-------------|
| `GLYSUM.xlsx` | Glycan substitution matrix (Alocci et al., *Glycobiology*, 2015) — used for glycan sequence alignment |
| `merged_glycan_dataset.csv` | Main annotated glycan dataset |
| `monosaccharides_counts.csv` | Monosaccharide frequency table used as replacement pool during motif mutation |
| `species_data.csv` | Glycan–species associations |

---

## Scientific Reference

See **`STATE_OF_THE_ART.md`** (and `STATE_OF_THE_ART.docx`) for a tool-by-tool comparison of GlycanBench against the existing state of the art in glycomics informatics, including precise algorithmic details and UX contributions for all 17 implemented tools.

---

## Citation

Vigneshwaran CJ & Ashok Palaniappan.  
*GlycanBench: a unified resource for working with glycans*, 2026 [submitted]

---

## Authors

**Vigneshwaran CJ**<sup>1</sup> & **Ashok Palaniappan**<sup>1,2</sup>*

<sup>1</sup> Systems Computational Biology Lab  
<sup>2</sup> Bioinformatics Center  
School of Chemical & Biotechnology, SASTRA Deemed University

📧 Corresponding author: [apalania@scbt.sastra.edu](mailto:apalania@scbt.sastra.edu)

---

© 2026 GlycanBench. All rights reserved. For academic non-commercial use only.
