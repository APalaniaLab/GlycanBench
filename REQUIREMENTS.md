# GlycanBench — Tech Stack, Business Requirements & Technical Requirements

> **Project:** GlycanBench — A unified resource for working with glycans
> **Live:** https://glycanbench.sastra.edu/
> **Repository:** `Full_stack_glycanbench` (Backend / Frontend / glycanbench_python_package)
> **Document version:** 1.0 — 14 September 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Business Requirements](#3-business-requirements)
4. [Technical Requirements](#4-technical-requirements)
5. [Constraints, Assumptions & Dependencies](#5-constraints-assumptions--dependencies)
6. [Traceability Matrix](#6-traceability-matrix)

---

## 1. Project Overview

GlycanBench is a full-stack, open web platform for glycan analysis. It brings together structure building, 2D/3D visualization, physicochemical analysis, sequence alignment, clustering, immunogenicity prediction, and an AI-powered literature assistant behind one browser interface and one REST API. The same capabilities are also shipped as an installable Python package (`glycanbench`) usable as an SDK, a CLI, or a self-hosted server.

The platform targets glycobiology researchers, bioinformaticians, and students who currently have to stitch together several programmatic libraries (glycowork, glypy, RDKit, BioPython) and external databases (GlyTouCan, KEGG, PubMed) to answer routine questions about a glycan.

---

## 2. Tech Stack

### 2.1 Architecture

```
┌──────────────────────────────┐        HTTP/JSON        ┌──────────────────────────────┐
│  Frontend (React 19 + Vite)  │ ──────────────────────▶ │  Backend (FastAPI + Uvicorn) │
│  TypeScript · Tailwind v4    │ ◀────────────────────── │  Python 3.10+                │
│  3Dmol.js · Cytoscape.js     │                         │  api/  (thin routers)        │
│  Chart.js · Axios            │                         │  core/ (framework-free)      │
└──────────────────────────────┘                         └──────────────┬───────────────┘
                                                                        │
                    ┌───────────────────────────┬───────────────────────┼───────────────────────┐
                    ▼                           ▼                       ▼                       ▼
            Scientific libs             ML inference             External APIs           Data files
   glycowork · glypy · RDKit        PyTorch + PyG (MPNN)    Groq LLM · PubMed · ArXiv   GLYSUM.xlsx
   BioPython · SciPy · sklearn      glycoword_vocab.json    GlyTouCan · KEGG REST       merged_glycan_dataset.csv
```

### 2.2 Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Language | Python | 3.10+ | Runtime |
| Web framework | FastAPI | 0.115.6 | REST API, OpenAPI/Swagger docs |
| ASGI server | uvicorn | 0.32.1 | Serves the FastAPI app on port 5000 |
| Validation | pydantic | 2.12.4 | Request/response schemas |
| HTTP client | httpx / requests | 0.28.1 / 2.31.0 | KEGG, GlyTouCan, PubMed calls |
| Config | python-dotenv | 1.0.0 | `.env` loading (`GROQ_API_KEY`, `CORS_ALLOWED_ORIGINS`) |
| Glycan processing | glycowork | 1.5.0 | Tokenization, SNFG drawing, biosynthetic networks, graph similarity, SugarBase annotations |
| Format conversion | glypy | 1.0.17 | GlycoCT ↔ WURCS |
| Cheminformatics | RDKit | 2024.9.6 | SMILES, descriptors, fingerprints, ETKDGv3/MMFF94s/UFF 3D conformers |
| Alignment | BioPython | 1.85 | Needleman-Wunsch with GLYSUM matrix |
| Deep learning | torch / torch-geometric | 2.9.1 / 2.7.0 | MPNN immunogenicity inference |
| Clustering | scipy / scikit-learn | — | Agglomerative & K-means clustering |
| Plotting | matplotlib / seaborn | — | Dendrograms, heatmaps, characterization charts |
| Numerics | numpy / pandas | 1.24.3 / 2.0.3 | Data handling |
| LLM integration | langchain-groq / langchain-community / langchain-core | 1.1.1 / 0.4.1 / 1.2.2 | GlycomicsChat, PubMed & ArXiv tools |
| LLM provider | Groq — `openai/gpt-oss-120b` | — | Chat model |

### 2.3 Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | ^20.19.0 or >=22.12.0 | Build toolchain (required by rolldown-vite) |
| Framework | React | 19.2 | UI |
| Language | TypeScript | ~5.9.3 | Type safety |
| Bundler | rolldown-vite | 7.2.5 | Dev server & production build |
| Compiler | babel-plugin-react-compiler | 1.0.0 | Automatic memoization |
| Styling | Tailwind CSS | 4.1 | Utility-first styling, dark/light mode |
| Routing | react-router-dom | 7.11 | Client-side routes (20 pages) |
| HTTP | axios | 1.13 | API calls |
| 3D viewer | 3dmol / ngl | 2.5.3 / 2.4.0 | Molecule rendering |
| Graph viewer | react-cytoscapejs | 2.0 | Biosynthetic networks |
| Charts | chart.js + react-chartjs-2 | 4.5 / 5.3 | Doughnut, bar, elbow plots |
| Animation | framer-motion | 12.23 | Transitions |
| Icons | lucide-react / react-icons | — | UI icons |
| Misc | react-select, react-zoom-pan-pinch, react-parallax-tilt, prismjs | — | Inputs, image zoom, tilt cards, code highlighting |
| Lint | eslint 9 + typescript-eslint | — | Code quality |

### 2.4 Python Package (`glycanbench_python_package`)

| Item | Detail |
|------|--------|
| Package name | `glycanbench` |
| Python | 3.8+ |
| License | MIT |
| Layout | `core/` (framework-free logic) · `api/` (thin FastAPI wrappers) · `sdk.py` (depends only on `core/`) · CLI entry point |
| Build | `pyproject.toml`, `pip install -e ".[dev,test]"`, `Makefile` |

### 2.5 ML Models & Data Assets

| Asset | Description |
|-------|-------------|
| `Models_MPNN_immunoClassifier_final.pt` | Active MPNN immunogenicity classifier (PyTorch Geometric) |
| `GAT_*.pt`, `GIN_*.pt`, `LSTM_*.pt` | Alternative architectures, stored, not deployed |
| `glycoword_vocab.json` | Glycoword (5-token sliding window) vocabulary for tokenization |
| `GLYSUM.xlsx` | Glycan substitution matrix (Alocci et al., 2015) |
| `merged_glycan_dataset.csv` | 1,356 annotated glycans (SugarBase schema + curated positives) |
| `monosaccharides_counts.csv` | Replacement pool for motif mutation |
| `species_data.csv` | Glycan–species associations (download endpoint) |

### 2.6 External Services

| Service | Used by | Auth |
|---------|---------|------|
| Groq API | GlycomicsChat | `GROQ_API_KEY` (required) |
| PubMed (E-utilities via LangChain) | GlycomicsChat tool | None |
| ArXiv API (via LangChain) | GlycomicsChat tool | None |
| GlyTouCan | Glycan Insight, Chat accession lookup | None |
| KEGG REST | Pathway viewer (server-side proxy) | None |
| LangSmith (optional) | Tracing | `LANGCHAIN_API_KEY` (optional) |

### 2.7 Tooling & Environment

| Item | Detail |
|------|--------|
| Backend start | `python start_server.py` or `uvicorn main:app --host 127.0.0.1 --port 5000 --reload` |
| Frontend start | `npm run dev` (port 5173) · `npm run build` (production) |
| API docs | Swagger `/docs`, ReDoc `/redoc` |
| Tests | `Backend/tests/` — dependency, endpoint, integration, and live tests; `glycanbench_python_package/tests/` |
| Version control | Git, GitHub (`APalaniaLab`) |
| Deployment | https://glycanbench.sastra.edu/ (frontend uses relative API paths in production) |

---

## 3. Business Requirements

### 3.1 Vision

Provide a single, free, browser-based workbench where a glycobiologist can create, visualize, analyse, compare, align, cluster, predict, and ask questions about glycans — without installing scientific libraries or writing code.

### 3.2 Stakeholders

| Stakeholder | Interest |
|-------------|----------|
| Glycobiology researchers | Fast, reproducible analysis of glycan structures without coding |
| Bioinformaticians / developers | REST API and Python SDK for pipeline integration |
| Students & educators | Interactive learning of glycan structure, nomenclature and biosynthesis |
| APalaniaLab / SASTRA University | Publication (Frontiers in Systems Biology), institutional hosting, citation |
| Reviewers & journal | Reproducibility, state-of-the-art comparison, open code |

### 3.3 Business Goals

| ID | Goal | Success Measure |
|----|------|-----------------|
| BG-1 | Consolidate fragmented glycan tooling into one platform | All 8 feature groups (Create, Visualize, Analyse, Compare, Align, Cluster, Predict, Chat) available from one UI and one API |
| BG-2 | Lower the barrier to glycan analysis | No local installation required; every tool usable from a browser with an IUPAC string |
| BG-3 | Offer capabilities not available in existing web tools | Interactive biosynthetic networks, GLYSUM-based web aligner, motif mutation simulator, MPNN immunogenicity predictor, glycomics-domain chatbot with live database tools (see `STATE_OF_THE_ART.md`) |
| BG-4 | Support programmatic and reproducible use | `glycanbench` Python package with SDK, CLI, and HTTP modes; OpenAPI documentation |
| BG-5 | Enable publication and citation | Manuscript submitted; datasets, models, and code publicly available under MIT |
| BG-6 | Sustain institutional hosting | Deployed at glycanbench.sastra.edu with environment-driven configuration |

### 3.4 Functional Business Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| BR-01 | Users can build a glycan click-by-click with grammar enforcement and immediately see 2D SNFG image, format conversions, and a 3D conformer | Must |
| BR-02 | Users can generate an interactive biosynthetic network from a set of glycans with configurable PTMs, roots, and edge types, and export it as PNG | Must |
| BR-03 | Users can convert between IUPAC, WURCS, GlycoCT, and SMILES; unsupported conversion paths are shown explicitly, not silently dropped | Must |
| BR-04 | Users can render any IUPAC glycan as an SNFG 2D drawing with optional motif highlighting | Must |
| BR-05 | Users can view an on-demand 3D conformer for any IUPAC glycan with multiple display styles and screenshot export | Must |
| BR-06 | Users can search and view KEGG glycan pathway maps and download them as PNG | Should |
| BR-07 | Users can characterize a monosaccharide's occurrence across taxonomic ranks | Should |
| BR-08 | Users can retrieve biological context (species, phyla, motifs, diseases, cell lines, GlyTouCan ID) for a glycan by IUPAC or accession | Must |
| BR-09 | Users can compute physicochemical descriptors, glycan-specific SMARTS motif counts, and fingerprints, with CSV export | Must |
| BR-10 | Users can run stochastic in-silico motif mutagenesis and see motif frequency distributions | Should |
| BR-11 | Users can compare two glycans via Tanimoto similarity across five fingerprint types | Must |
| BR-12 | Users can align two glycan sequences with the GLYSUM matrix or custom scoring, and export the result | Must |
| BR-13 | Users can cluster ≥3 glycans (agglomerative or K-means), optimize cluster count, and detect outliers, with dendrogram/heatmap/CSV outputs | Must |
| BR-14 | Users can predict glycan immunogenicity with a confidence score, rule-based motif flags, and JSON download | Must |
| BR-15 | Users can ask glycomics questions to an AI assistant that stays within the domain and cites live PubMed, ArXiv, and GlyTouCan results | Must |
| BR-16 | Developers can access every capability via documented REST endpoints and via the `glycanbench` Python package | Must |
| BR-17 | The platform provides Help and About pages describing tools, methods, authors, and citation | Should |
| BR-18 | The platform is free to use and requires no account | Must |

### 3.5 Out of Scope (current release)

- User accounts, saved sessions, or job history
- Batch upload of thousands of glycans (single/small-set analysis only)
- Molecular dynamics or GLYCAM-quality force-field refinement
- Training or fine-tuning of ML models from the UI
- Commercial licensing or paid tiers

---

## 4. Technical Requirements

### 4.1 Functional Technical Requirements (API)

| ID | Endpoint(s) | Requirement | Traces to |
|----|-------------|-------------|-----------|
| TR-F01 | `POST /api/convert` | Accept one format + string; return IUPAC, SMILES, GlycoCT, WURCS. Unsupported paths return an explicit notice field | BR-01, BR-03 |
| TR-F02 | `POST /api/network`, `GET /api/network-parameters` | Return Cytoscape.js element JSON from a glycan list with selectable PTMs, roots, and edge type (`monolink` / `full_reaction` / `enzyme`) | BR-02 |
| TR-F03 | `POST /api/draw` | Return base64 PNG SNFG rendering via glycowork `GlycoDraw`; accept optional `highlight_motif` | BR-01, BR-04 |
| TR-F04 | `POST /api/visualize` | IUPAC → 3D MDL Molfile using ETKDGv3 → MMFF94s (≤ 2×2000 iterations) → UFF fallback | BR-01, BR-05 |
| TR-F05 | `GET /api/pathway`, `/search_pathways`, `/proxy_image` | KEGG REST lookup with direct-PNG fallback; autocomplete requires ≥3 characters; server-side proxy for CORS | BR-06 |
| TR-F06 | `POST /api/characterize` | Return occurrence chart (PNG) for a monosaccharide with rank, focus, modifications, and threshold parameters | BR-07 |
| TR-F07 | `POST /api/glycan_insight` | Resolve IUPAC or GlyTouCan accession to species, phyla, motifs, cell lines, diseases, class, GlyTouCan ID | BR-08 |
| TR-F08 | `POST /api/descriptor` | Return 17 descriptors, elemental composition, 5 SMARTS motif counts, 5 × 2048-bit fingerprints | BR-09 |
| TR-F09 | `POST /api/motif/mutate`, `/small`, `/find` | Mutagenesis with `normal` / `moderate` / `extreme` modes; pentamer glycoword extraction; token flattening | BR-10 |
| TR-F10 | `POST /api/compare_glycans` | Tanimoto over Morgan R2/R3, Atom Pair, Torsion, RDKit fingerprints | BR-11 |
| TR-F11 | `POST /api/align` | Needleman-Wunsch with GLYSUM or custom match/mismatch/gap; fuzzy token cutoff 0.85; return alignment, score, identity | BR-12 |
| TR-F12 | `POST /api/cluster/run` | Modes `standard`, `optimal_k`, `outliers`; metrics Tanimoto / Dice / Cosine / Euclidean / glycowork graph similarity; linkages single/complete/average/ward; outlier threshold 0.45 | BR-13 |
| TR-F13 | `POST /api/validate`, `POST /api/predict` | Validate tokens against `glycoword_vocab.json`; run MPNN; return probability, label (threshold 0.5), confidence, motif flags | BR-14 |
| TR-F14 | `POST /api/GlycomicsChat` + tool/capability endpoints | Domain-enforced system prompt; LLM-based tool router with keyword fallback; PubMed, ArXiv, GlyTouCan, Structure Analysis, Synthesis tools; structured accession panels | BR-15 |
| TR-F15 | `GET /api/download` | Stream species dataset CSV filtered by `species` query param | BR-08 |
| TR-F16 | `GET /`, `GET /api/health` | Liveness check; chat health includes LLM connectivity test | BG-6 |
| TR-F17 | `/docs`, `/redoc` | Auto-generated OpenAPI documentation for all routes | BR-16 |

### 4.2 Functional Technical Requirements (Frontend)

| ID | Requirement | Traces to |
|----|-------------|-----------|
| TR-U01 | Single-page React app with 20 client-side routes matching the feature list (see README "Frontend Routes") | BR-01 … BR-17 |
| TR-U02 | All API calls go through axios; base URL is `http://localhost:5000` in development and relative in production | BG-6 |
| TR-U03 | 3D structures rendered in 3Dmol.js with ≥4 display styles and screenshot export | BR-05 |
| TR-U04 | Biosynthetic networks rendered in Cytoscape.js with dark/light mode, node search, PNG export | BR-02 |
| TR-U05 | Charts rendered with Chart.js (Doughnut for phyla, bar for motif frequency, elbow for cluster optimization) | BR-08, BR-10, BR-13 |
| TR-U06 | Unsupported conversion paths surfaced as visible orange notices | BR-03 |
| TR-U07 | Responsive layout usable on desktop and tablet widths (see `Frontend/RESPONSIVE_DESIGN.md`) | BG-2 |
| TR-U08 | Downloads available where specified: PNG (network, pathway, 3D screenshot), CSV (descriptors, clusters), TXT (alignment), JSON (prediction) | BR-02, BR-06, BR-09, BR-12, BR-13, BR-14 |

### 4.3 Python Package Requirements

| ID | Requirement | Traces to |
|----|-------------|-----------|
| TR-P01 | Every capability callable through `glycanbench.sdk` without a running server | BR-16 |
| TR-P02 | `core/` must not import FastAPI; `api/` is a thin wrapper over `core/` | BR-16 |
| TR-P03 | CLI entry point exposes the same operations | BR-16 |
| TR-P04 | Installable via `pip install -e .`; heavy scientific dependencies declared in `pyproject.toml` | BR-16 |
| TR-P05 | Unit tests under `tests/` runnable via `make test` / pytest | BG-5 |

### 4.4 Non-Functional Requirements

#### Performance

| ID | Requirement |
|----|-------------|
| TR-N01 | Stateless endpoints (draw, convert, descriptor, compare, align) respond within a few seconds for typical glycans (≤ ~20 monosaccharides) |
| TR-N02 | 3D conformer generation bounded by MMFF94s iteration cap (2×2000) to prevent runaway compute |
| TR-N03 | MPNN model loaded once at startup, not per request |
| TR-N04 | Chat responses stream or return within LLM provider latency; tool calls limited per query |

#### Reliability & Error Handling

| ID | Requirement |
|----|-------------|
| TR-N05 | Invalid IUPAC or unknown tokens return HTTP 4xx with a human-readable message, never a stack trace |
| TR-N06 | External service failures (KEGG, GlyTouCan, Groq, PubMed) degrade gracefully with an explicit error, not a crash |
| TR-N07 | 3D pipeline falls back ETKDGv3 → ETKDG → UFF instead of failing outright |
| TR-N08 | Chat tool router falls back to keyword heuristics when LLM routing fails |

#### Security

| ID | Requirement |
|----|-------------|
| TR-N09 | Secrets (`GROQ_API_KEY`, `LANGCHAIN_API_KEY`) loaded from `.env` / environment only; never committed |
| TR-N10 | CORS origins configured via `CORS_ALLOWED_ORIGINS`; defaults to localhost dev origins only |
| TR-N11 | KEGG image proxy restricted to KEGG hosts (no open proxy) |
| TR-N12 | All request bodies validated by pydantic schemas; no arbitrary code or file paths accepted from users |
| TR-N13 | No user data persisted server-side; no PII collected |

#### Maintainability

| ID | Requirement |
|----|-------------|
| TR-N14 | One router file per feature under `Backend/api/`; scientific logic separated in `Backend/core/` |
| TR-N15 | Pinned dependency versions in `requirements.txt` and `package.json` |
| TR-N16 | Frontend passes `tsc -b` and `eslint .` with zero errors |
| TR-N17 | README API tables kept in sync with router source |

#### Compatibility & Portability

| ID | Requirement |
|----|-------------|
| TR-N18 | Backend runs on Python 3.10+ (Windows, Linux, macOS); CPU-only inference supported |
| TR-N19 | Frontend builds on Node ^20.19 or ≥22.12; supports current Chrome, Firefox, Edge, Safari with WebGL (required by 3Dmol.js) |
| TR-N20 | Production frontend uses relative API paths so it can be served behind a reverse proxy alongside the backend |

#### Usability & Accessibility

| ID | Requirement |
|----|-------------|
| TR-N21 | Every tool page provides example inputs so a first-time user can run it without prior knowledge |
| TR-N22 | Dark/light mode supported on graph-heavy views |
| TR-N23 | Tooltips explain scientific parameters (e.g., fingerprint types, linkage methods) |

### 4.5 Data Requirements

| ID | Requirement |
|----|-------------|
| TR-D01 | `merged_glycan_dataset.csv` follows the glycowork SugarBase schema; source column distinguishes `glycobase.csv` (1,320 rows) from `immunogenic_glycans_clean.csv` (36 rows) |
| TR-D02 | Known 12 contradictory labels documented in README; deduplicated version produced by `Backend/dataset/deduplicate_dataset.py` → `merged_glycan_dataset_clean.csv` |
| TR-D03 | `glycoword_vocab.json` regenerated via `Backend/vocab/generate_vocab.py` whenever the training dataset changes |
| TR-D04 | Model files (`.pt`) versioned alongside the vocabulary they were trained with |
| TR-D05 | GLYSUM matrix loaded from `GLYSUM.xlsx` at startup; citation Alocci et al., *Glycobiology*, 2015 |

### 4.6 Testing Requirements

| ID | Requirement |
|----|-------------|
| TR-T01 | `Backend/tests/test_dependencies.py` verifies all scientific libraries import correctly |
| TR-T02 | `Backend/tests/test_api_integration.py` and `test_working_endpoints.py` exercise every router against a running server |
| TR-T03 | `Backend/tests/test_live_integration.py` validates external services (Groq, PubMed, ArXiv, GlyTouCan, KEGG) |
| TR-T04 | `Backend/tests/diagnose_api.py` provides a one-shot diagnostic for deployment troubleshooting |
| TR-T05 | Python package has its own pytest suite under `glycanbench_python_package/tests/` |

### 4.7 Deployment Requirements

| ID | Requirement |
|----|-------------|
| TR-X01 | Backend served by uvicorn (optionally behind a reverse proxy such as nginx) on port 5000 |
| TR-X02 | Frontend built with `npm run build` and served as static files; API reached via relative `/api/*` paths |
| TR-X03 | Environment variables: `GROQ_API_KEY` (required), `CORS_ALLOWED_ORIGINS` (required in production), `LANGCHAIN_API_KEY` (optional) |
| TR-X04 | Runtime export artifacts (`Backend/exports/`) excluded from version control |
| TR-X05 | Production host: glycanbench.sastra.edu (SASTRA University) |

---

## 5. Constraints, Assumptions & Dependencies

### Constraints

- GlycomicsChat requires a valid Groq API key and internet access; without it the chat feature is unavailable while all other tools continue to work.
- IUPAC → GlycoCT/WURCS conversion is not supported by the underlying libraries; this limitation is surfaced to users rather than worked around.
- 3D conformers are force-field (MMFF94s/UFF) quality, not GLYCAM-level; suitable for visualization, not for simulation.
- The MPNN model was trained on 1,356 glycans; predictions are indicative and carry a confidence score.

### Assumptions

- Users supply glycans in IUPAC-condensed notation (or GlyTouCan accession where accepted).
- External databases (KEGG, GlyTouCan, PubMed, ArXiv) remain publicly accessible without authentication.
- Typical workloads are single glycans or small sets (< 100) per request.

### Dependencies

- glycowork ≥ 1.5.0 for SugarBase annotations, GlycoDraw, and network construction.
- RDKit 2024.9.6 for ETKDGv3 and fingerprint APIs.
- PyTorch 2.9.1 + PyTorch Geometric 2.7.0 compatible with the saved MPNN weights.

---

## 6. Traceability Matrix

| Business Goal | Business Requirements | Technical Requirements |
|---------------|----------------------|------------------------|
| BG-1 Consolidation | BR-01 … BR-15 | TR-F01 … TR-F14, TR-U01 |
| BG-2 Low barrier | BR-18, BR-17 | TR-U02, TR-U07, TR-N21, TR-N23 |
| BG-3 Novel capabilities | BR-02, BR-10, BR-12, BR-14, BR-15 | TR-F02, TR-F09, TR-F11, TR-F13, TR-F14 |
| BG-4 Programmatic use | BR-16 | TR-F17, TR-P01 … TR-P05 |
| BG-5 Publication | BR-17 | TR-D01 … TR-D05, TR-T01 … TR-T05, TR-N15 |
| BG-6 Hosting | — | TR-F16, TR-N09 … TR-N13, TR-X01 … TR-X05 |

---

*Related documents:* [README.md](README.md) · [STATE_OF_THE_ART.md](STATE_OF_THE_ART.md) · [Backend/README.md](Backend/README.md) · [Frontend/README.md](Frontend/README.md) · [Frontend/RESPONSIVE_DESIGN.md](Frontend/RESPONSIVE_DESIGN.md)
