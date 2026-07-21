# GlycanBench Frontend

React + TypeScript single-page app for GlycanBench — the client for all 20 glycan analysis tools served by the Backend.

## Overview

The frontend is a Vite-built React 19 SPA with 20 routed tool pages spanning creation, visualization, analysis, comparison, alignment, clustering, prediction, and AI chat. Every route is wrapped in a shared `Header`/`Footer` layout; navigation (desktop mega-menu + mobile sidebar) is driven by a single `sidebarNavConfig` shared between `NavBar` and `Footer`.

---

## Routes

| Path | Component | Category |
|------|-----------|----------|
| `/` | `Home` | Landing |
| `/aboutus` | `AboutUs` | Info |
| `/help` | `Help` | Info |
| `/GlycanMolecule` | `GlycanMolecule` | Create |
| `/BiosyntheticNetworks` | `BiosyntheticNetworks` | Create |
| `/GlycanFormatConverter` | `GlycanFormatConverter` | Create |
| `/GlycanDrawer` | `GlycanDrawer` | Visualize |
| `/visualize` | `VisualizePage` | Visualize |
| `/pathwayMaps` | `PathwayViewer` | Visualize |
| `/characterize` | `CharacterizeForm` | Analyze |
| `/DescriptorCalculator` | `DescriptorCalculator` | Analyze |
| `/MotifMutation` | `MotifMutation` | Analyze |
| `/GlycanInsight` | `GlycanInsight` | Analyze |
| `/CompareGlycans` | `CompareGlycans` | Compare |
| `/sequenceAlignment` | `SequenceAlignment` | Align |
| `/cluster/multiple` | `ClusterMultipleGlycans` | Cluster |
| `/cluster/optimize` | `OptimalClusters` | Cluster |
| `/cluster/outliers` | `DetectOutlierGlycans` | Cluster |
| `/prediction` | `Prediction` | Predict |
| `/GlycomicsChat` | `GlycomicsChat` | Chat |

Paths are case-sensitive as written above (e.g. `/GlycanMolecule`, not `/glycanmolecule`).

---

## Project Structure

```
Frontend/
├── index.html
├── vite.config.ts              # React Compiler (babel) + Tailwind v4 plugin
├── eslint.config.js             # Flat config, typescript-eslint + react-hooks
├── RESPONSIVE_DESIGN.md         # Mobile-first responsive design notes
│
└── src/
    ├── main.tsx                 # StrictMode root
    ├── App.tsx                  # Router + 20 route definitions
    │
    ├── Components/
    │   ├── Home.tsx              # Landing page, 3Dmol.js hero viewer, feature CTAs
    │   ├── Header.tsx            # Sticky header, mobile hamburger sidebar
    │   ├── NavBar.tsx             # Desktop mega-menu + mobile sidebar nav
    │   ├── Footer.tsx             # Mirrors NavBar's nav config + citation
    │   └── Logo.tsx               # Wordmark, links to /
    │
    ├── Pages/
    │   ├── AboutUs.tsx
    │   ├── Help.tsx
    │   ├── Create/
    │   │   ├── GlycanMolecule/
    │   │   └── BiosyntheticNetworks/   # + 9 helper components (controls, graph, settings)
    │   ├── Analyze/
    │   │   ├── CharacterizeForm/
    │   │   ├── DescriptorCalculator/
    │   │   ├── MotifMutation/
    │   │   ├── GlycanDrawer/
    │   │   ├── Visualization/           # VisualizePage.tsx
    │   │   ├── PathwayViewer/
    │   │   ├── GlycanFormatConverter/
    │   │   ├── CompareGlycans/
    │   │   ├── ClusterMultipleGlycans.tsx
    │   │   ├── OptimalClusters.tsx
    │   │   └── DetectOutlierGlycans.tsx
    │   ├── Align/SequenceAlignment/
    │   ├── Browse/
    │   │   ├── GlycanInsight/
    │   │   └── ChatGlyco/               # not routed — unused, kept on disk
    │   └── Predict/
    │       ├── Prediction/
    │       └── Chat/                    # GlycomicsChat.tsx
    │
    ├── services/
    │   └── chatApi.ts            # ChatApiService — only centralized API client (chat/tools)
    │
    ├── hooks/
    │   └── useToolExamples.ts    # Wraps ChatApiService for tool/example listing
    │
    ├── utils/
    │   ├── const.ts               # BASE_URL, getErrorMessage (shared by most pages)
    │   └── testApi.ts             # Dev-only self-test, pinged 2s after App.tsx loads
    │
    ├── types/
    │   └── global.d.ts            # Ambient module declarations (3dmol, ngl, react-cytoscapejs, prismjs)
    │
    └── styles/
        └── responsive.css         # Touch target sizing, safe-area insets
```

> Most pages (Prediction, GlycanDrawer, CharacterizeForm, CompareGlycans, PathwayViewer, BiosyntheticNetworks, etc.) call `axios`/`fetch` directly using `BASE_URL` + `getErrorMessage` from `utils/const.ts`. Only the chat/tools feature goes through a dedicated service class (`services/chatApi.ts`).

---

## Technology Stack

| Package | Version | Purpose |
|---------|---------|---------|
| react / react-dom | ^19.2.0 | UI framework |
| vite (aliased to rolldown-vite) | 7.2.5 | Build tool — Rolldown-based Vite fork |
| typescript | ~5.9.3 | Type checking |
| tailwindcss / @tailwindcss/vite | ^4.1.18 | Styling (CSS-first config, no `tailwind.config.js`) |
| react-router-dom | ^7.11.0 | Client-side routing |
| axios | ^1.13.2 | HTTP requests |
| framer-motion | ^12.23.26 | Animations (nav menus, transitions) |
| 3dmol | ^2.5.3 | 3D molecular visualization |
| ngl | ^2.4.0 | Alternative 3D structure viewer |
| react-cytoscapejs | ^2.0.0 | Biosynthetic network graph |
| chart.js / react-chartjs-2 | ^4.5.1 / ^5.3.1 | Doughnut & bar charts |
| react-zoom-pan-pinch | ^3.7.0 | KEGG pathway interactive viewer |
| react-select | ^5.10.2 | Dropdowns (fingerprint/metric selectors) |
| prismjs | ^1.30.0 | Syntax highlighting |
| react-parallax-tilt | ^1.7.315 | Landing page hover effects |
| lucide-react / react-icons | ^0.562.0 / ^5.5.0 | Icon libraries |
| babel-plugin-react-compiler | ^1.0.0 | React Compiler (enabled via Vite's Babel config) |

---

## Setup

### Prerequisites
- Node.js `^20.19.0` or `>=22.12.0` — required by rolldown-vite. Older Node (e.g. 20.17) silently fails to install the platform-specific native binding (`npm has a bug related to optional dependencies`, npm/cli#4828); upgrading Node and reinstalling is the only fix, not retrying `npm install`.
- Backend running at `http://localhost:5000` (see `Backend/README.md`)

### Install & Run

```bash
cd Frontend

npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # tsc -b && vite build — production build
npm run preview    # preview production build locally
npm run lint        # eslint .
```

`BASE_URL` (`src/utils/const.ts`) resolves to `http://localhost:5000` when `window.location.hostname === "localhost"`, and to a relative path otherwise (production, same-origin deploy).

---

## Notes

- **Dead code:** `src/Pages/Browse/ChatGlyco/` (`ChatGlyco.tsx`, `FloatingChat.tsx`) is not imported by `App.tsx` — no route uses it.
- **No shared API client:** aside from `services/chatApi.ts`, every other page does its own `axios`/`fetch` call inline. Consider a shared `apiClient` only if/when touching multiple pages at once — not worth a speculative refactor on its own.
- **CORS:** the Backend's `CORS_ALLOWED_ORIGINS` env var must include this dev server's origin (`http://localhost:5173` is the default).

---

## License

MIT License. For academic non-commercial use.
