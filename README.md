# GlycanBench

> **A unified resource for working with glycans**

🌐 **Live Platform:** [https://glycanbench.sastra.edu/](https://glycanbench.sastra.edu/)  
📖 **API Docs:** `http://127.0.0.1:5000/docs` (when running locally)

GlycanBench is a full-stack integrated web platform for glycan analysis — spanning conception, visualization, analysis, alignment, clustering, property prediction, and literature exploration in Glycobiology.

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

### 🔮 Predict
| Tool | Description |
|------|-------------|
| **Immunogenicity Prediction** | Graph Neural Network (MPNN) predicts glycan immunogenicity from IUPAC-condensed sequences. Outputs Immunogenic / Non-Immunogenic label with confidence score, motif detection (AlphaGal, NonHumanSialicAcid, ComplexNGlycan), and vocabulary analysis. |
| **GlycomicsChat** | AI-powered glycomics assistant (Groq LLM) with PubMed + ArXiv literature search, GlyTouCan accession lookup, and structural data retrieval. |

### 🔬 Analyse
| Tool | Description |
|------|-------------|
| **Monosaccharide Characterization** | Generate characterization plots for monosaccharide residues using glycowork. |
| **Molecule Descriptors** | Calculate ~20 physicochemical descriptors (MW, TPSA, LogP, rings, H-bond donors/acceptors, stereocenters, Pyranose/Furanose rings, N-acetyl groups, elemental composition) via RDKit. |
| **Glycan Insight** | Retrieve biological context for a glycan — species, phyla, motifs, cell lines, diseases, glycan class — from glycowork. |
| **Motif Mutation** | Simulate random structural mutations and analyze motif frequency distributions. |

### 📐 Align
| Tool | Description |
|------|-------------|
| **Sequence Alignment** | Global pairwise alignment of glycan sequences using the **GLYSUM substitution matrix** or custom scoring. Powered by BioPython PairwiseAligner. Outputs aligned sequences, match line, alignment score, and percent identity. |

### 📊 Compare & Cluster
| Tool | Description |
|------|-------------|
| **Compare Fingerprints** | Side-by-side Tanimoto similarity across Morgan (R2/R3), AtomPair, Torsion, and RDKit fingerprints for two glycan SMILES. |
| **Cluster Glycans** | Cluster ≥3 glycans by structural fingerprint similarity using agglomerative (hierarchical) or k-means clustering. Outputs dendrogram, pairwise heatmap, and cluster assignments. |
| **Find Optimal Clusters** | Threshold sweep (agglomerative) or k sweep (k-means) to determine optimal cluster count via elbow plot. |
| **Detect Outlier Glycans** | Identify singleton clusters as potential structural outliers, with mean-distance scoring and STRONG OUTLIER flagging. |

### 👁️ Visualize
| Tool | Description |
|------|-------------|
| **3D Representation** | Interactive 3D molecular viewer (3Dmol.js) from IUPAC sequences. Styles: Ball & Stick, Spacefill (CPK), Wireframe, Stick Figure. Screenshot export. |
| **2D Draw** | SNFG-style 2D glycan structure rendering with optional motif highlighting. |
| **KEGG Pathway View** | Map glycans to KEGG metabolic pathways with direct pathway image display. |

### 🏗️ Create
| Tool | Description |
|------|-------------|
| **Glycan Molecule** | 3D structure builder from IUPAC sequence. |
| **Biosynthetic Networks** | Build and visualize glycan biosynthetic pathway networks with configurable PTMs, roots, and edge types (monolink, full_reaction, enzyme). |
| **Format Converter** | Interconvert glycan representations: IUPAC ↔ WURCS ↔ GlycoCT ↔ SMILES. |

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.115.6 | REST API framework |
| uvicorn | 0.32.1 | ASGI server |
| pydantic | 2.12.4 | Data validation |
| torch | 2.9.1 | Deep learning (MPNN models) |
| torch-geometric | 2.7.0 | Graph Neural Networks |
| rdkit | 2024.9.6 | Cheminformatics & fingerprints |
| glycowork | 1.5.0 | Glycan processing & analysis |
| glypy | 1.0.17 | Glycan format conversion |
| biopython | 1.85 | Sequence alignment |
| langchain-groq | 1.1.1 | LLM integration (Groq) |
| langchain-community | 0.4.1 | PubMed & ArXiv tools |
| numpy | 1.24.3 | Numerical computing |
| pandas | 2.0.3 | Data handling |
| httpx | 0.28.1 | HTTP client |
| python-dotenv | 1.0.0 | Environment config |

### Frontend
| Package | Purpose |
|---------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| 3Dmol.js | 3D molecular visualization |
| React Router v6 | Client-side routing |
| Axios | HTTP requests |
| React Icons | Icon library |
| React Parallax Tilt | Card tilt effects |

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
│   │   ├── cluster_api.py             # POST /api/cluster/run
│   │   ├── seq_align_api.py           # POST /api/align
│   │   ├── compare_api.py             # POST /api/compare_glycans
│   │   ├── descriptor_api.py          # POST /api/descriptor
│   │   ├── visualize_api.py           # POST /api/visualize
│   │   ├── draw_api.py                # POST /api/draw
│   │   ├── characterize_api.py        # POST /api/characterize
│   │   ├── convert_api.py             # POST /api/convert
│   │   ├── motif_api.py               # POST /api/motif/mutate, /small, /find
│   │   ├── network_api.py             # GET /api/network-parameters, POST /api/network
│   │   ├── pathway_api.py             # GET /api/pathway, /search_pathways, /proxy_image
│   │   ├── insight_api.py             # POST /api/glycan_insight
│   │   ├── species_api.py             # GET /api/download
│   │   └── chat/
│   │       ├── router.py              # POST /api/GlycomicsChat + 10 helper endpoints
│   │       ├── llm.py                 # Groq LLM chain (glycomics system prompt)
│   │       ├── tools.py               # PubMed + ArXiv search tools
│   │       ├── glycan_utils.py        # GlyTouCan API integration
│   │       ├── capabilities.py        # Tool capability detection
│   │       ├── config.py              # API keys, constants, enums
│   │       └── models.py              # Pydantic request/response models
│   ├── models/
│   │   ├── Models_MPNN_immunoClassifier_final.pt   # Active MPNN model
│   │   ├── GAT_immunoClassifier_large.pt
│   │   ├── GIN_immunoClassifier_large.pt
│   │   ├── LSTM_immunoClassifier_large.pt
│   │   ├── models_glycoletters_model.pt
│   │   └── models_glycowords_model.pt
│   ├── dataset/
│   │   ├── GLYSUM.xlsx                # Glycan substitution matrix
│   │   ├── merged_glycan_dataset.csv  # Main glycan dataset
│   │   ├── monosaccharides_counts.csv # Monosaccharide frequency counts
│   │   └── species_data.csv           # Species-level glycan data
│   └── vocab/
│       └── glycoword_vocab.json       # Glycoword vocabulary for MPNN
│
└── Frontend/
    └── src/
        ├── App.tsx                    # Router + route definitions (24 routes)
        ├── Components/
        │   ├── Home.tsx               # Hero, typing animation, CTA buttons
        │   ├── Header.tsx             # Sticky header + mobile hamburger
        │   ├── NavBar.tsx             # Desktop mega-menu + mobile sidebar
        │   └── Footer.tsx             # Navigation grid + citation
        └── Pages/
            ├── Predict/
            │   ├── Prediction/        # MPNN immunogenicity predictor
            │   └── Chat/              # GlycomicsChat UI
            ├── Analyze/
            │   ├── CharacterizeForm/  # Monosaccharide characterization
            │   ├── DescriptorCalculator/ # Molecule descriptors
            │   ├── Visualization/     # 3D viewer (3Dmol.js)
            │   ├── GlycanDrawer/      # 2D SNFG drawing
            │   ├── CompareGlycans/    # Fingerprint comparison
            │   ├── ClusterMultipleGlycans.tsx  # Clustering
            │   ├── OptimalClusters.tsx         # Optimal k analysis
            │   ├── DetectOutlierGlycans.tsx    # Outlier detection
            │   ├── MotifMutation/     # Motif mutation simulator
            │   ├── GlycanFormatConverter/      # Format conversion
            │   └── PathwayViewer/     # KEGG pathway view
            ├── Align/
            │   └── SequenceAlignment/ # GLYSUM-based alignment
            ├── Create/
            │   ├── GlycanMolecule/    # 3D molecule builder
            │   └── BiosyntheticNetworks/ # Network visualization
            └── Browse/
                └── GlycanInsight/     # Species, motifs, diseases
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- conda or virtualenv (recommended)

### Backend Setup

```bash
cd Backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Add your GROQ_API_KEY to .env for GlycomicsChat

# Start server
python start_server.py
# OR
uvicorn main:app --host 127.0.0.1 --port 5000 --reload
```

Server runs at: `http://127.0.0.1:5000`  
Swagger docs: `http://127.0.0.1:5000/docs`  
Redoc: `http://127.0.0.1:5000/redoc`

### Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Dev server at http://localhost:5173

# Build for production
npm run build
```

> The frontend auto-detects the environment. On `localhost` it connects to `http://localhost:5000`. In production (same domain) it uses relative paths.

---

## API Reference

All endpoints accept and return JSON unless noted otherwise.

### Prediction
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/validate` | Validate IUPAC glycan sequence |
| `POST` | `/api/predict` | MPNN immunogenicity prediction |

### Clustering
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/cluster/run` | Run clustering (modes: `standard`, `optimal_k`, `outliers`) |

### Alignment & Comparison
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/align` | Global pairwise alignment (GLYSUM or custom scoring) |
| `POST` | `/api/compare_glycans` | Tanimoto fingerprint similarity |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/descriptor` | Molecular descriptor calculation |
| `POST` | `/api/characterize` | Monosaccharide characterization plot |
| `POST` | `/api/glycan_insight` | Biological context (species, motifs, diseases) |
| `POST` | `/api/motif/mutate` | Random motif mutation |
| `POST` | `/api/motif/find` | Extract motifs from sequence |

### Visualization
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/visualize` | IUPAC → 3D MolBlock (for 3Dmol.js) |
| `POST` | `/api/draw` | IUPAC → 2D SNFG image (base64 PNG) |
| `GET`  | `/api/pathway` | KEGG pathway image |
| `GET`  | `/api/search_pathways` | Search KEGG pathways |

### Creation
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/convert` | Format conversion (IUPAC/WURCS/GlycoCT/SMILES) |
| `POST` | `/api/network` | Build biosynthetic network |
| `GET`  | `/api/network-parameters` | Available PTMs, roots, edge types |
| `GET`  | `/api/download` | Download species glycan data as CSV |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/GlycomicsChat` | AI glycomics assistant |
| `GET`  | `/api/health` | Health check + LLM connectivity |
| `GET`  | `/api/tools/capabilities` | Available tool descriptions |

---

## Frontend Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page with 3D viewer |
| `/prediction` | Prediction | MPNN immunogenicity predictor |
| `/GlycomicsChat` | GlycomicsChat | AI glycomics chat |
| `/sequenceAlignment` | SequenceAlignment | GLYSUM-based alignment |
| `/CompareGlycans` | CompareGlycans | Fingerprint comparison |
| `/cluster/multiple` | ClusterMultipleGlycans | Cluster ≥3 glycans |
| `/cluster/optimize` | OptimalClusters | Find optimal cluster count |
| `/cluster/outliers` | DetectOutlierGlycans | Detect structural outliers |
| `/DescriptorCalculator` | DescriptorCalculator | Molecule descriptors |
| `/characterize` | CharacterizeForm | Monosaccharide analysis |
| `/GlycanInsight` | GlycanInsight | Biological context lookup |
| `/MotifMutation` | MotifMutation | Motif mutation simulator |
| `/visualize` | VisualizePage | 3D structure viewer |
| `/GlycanDrawer` | GlycanDrawer | 2D SNFG drawing |
| `/pathwayMaps` | PathwayViewer | KEGG pathway maps |
| `/GlycanFormatConverter` | GlycanFormatConverter | Format conversion |
| `/GlycanMolecule` | GlycanMolecule | 3D molecule builder |
| `/BiosyntheticNetworks` | BiosyntheticNetworks | Biosynthetic network builder |
| `/aboutus` | AboutUs | About the platform |
| `/help` | Help | Documentation |

---

## ML Models

The immunogenicity prediction uses a **Message Passing Neural Network (MPNN)** built with PyTorch Geometric.

### Architecture
- **Embedding layer:** vocabulary size × 64
- **MPNN Layer 1:** 64 → 64 with BatchNorm + ReLU
- **MPNN Layer 2:** 64 → 64 with BatchNorm + ReLU
- **Global mean pooling**
- **Linear:** 64 → 32 → 1 (with dropout 0.5)
- **Output:** sigmoid → ≥ 0.5 = Immunogenic

### Input Representation
Glycan sequences are tokenized into **glycowords** (5-token sliding windows of monosaccharides and linkages), converted to vocabulary indices, and represented as a graph with sequential edges.

### Available Model Files
| File | Architecture |
|------|-------------|
| `Models_MPNN_immunoClassifier_final.pt` | MPNN (active) |
| `GAT_immunoClassifier_large.pt` | Graph Attention Network |
| `GIN_immunoClassifier_large.pt` | Graph Isomorphism Network |
| `LSTM_immunoClassifier_large.pt` | LSTM |

---

## Datasets

| File | Description |
|------|-------------|
| `GLYSUM.xlsx` | Glycan substitution matrix for glycan-aware pairwise alignment |
| `merged_glycan_dataset.csv` | Main annotated glycan dataset |
| `monosaccharides_counts.csv` | Monosaccharide frequency table used for mutation pool sampling |
| `species_data.csv` | Glycan-species associations for dataset download |

---

## Citation

Vigneshwaran CJ & Ashok Palaniappan.  
*GlycanBench: a unified resource for working with glycans*, 2026 [submitted]

---

## Authors

**Vigneshwaran CJ**<sup>1</sup> & **Ashok Palaniappan**<sup>1,2</sup> *

<sup>1</sup> Systems Computational Biology Lab  
<sup>2</sup> Bioinformatics Center  
School of Chemical & Biotechnology, SASTRA Deemed University

📧 Corresponding author: [apalania@scbt.sastra.edu](mailto:apalania@scbt.sastra.edu)

---

© 2026 GlycanBench. All rights reserved. Only for academic non-commercial use.
