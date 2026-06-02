import React, { useState, useRef, useEffect } from "react";
import {
  FaSpinner,
  FaMagic,
  FaCamera,
  FaUndoAlt,
  FaTrashAlt,
  FaCubes,
} from "react-icons/fa";
import axios from "axios";
import * as $3Dmol from "3dmol";
import { BASE_URL } from "../../../utils/const";

// ── Types ────────────────────────────────────────────────────────────────────
interface StyleConfig extends Record<string, unknown> {
  stick?: { radius: number; colorscheme: string };
  sphere?: { scale?: number; colorscheme: string };
  line?: { linewidth: number; colorscheme: string };
}
interface StyleDefinition {
  label: string;
  config: StyleConfig;
}
interface StylesState {
  ballAndStick: boolean;
  spacefill: boolean;
  wireframe: boolean;
  stickFigure: boolean;
}
interface VisualizationResponse {
  molBlock: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const styleDefinitions: Record<string, StyleDefinition> = {
  ballAndStick: {
    label: "Ball & Stick",
    config: {
      stick: { radius: 0.08, colorscheme: "elem" },
      sphere: { scale: 0.25, colorscheme: "elem" },
    },
  },
  spacefill: {
    label: "Spacefill (CPK)",
    config: { sphere: { colorscheme: "elem" } },
  },
  wireframe: {
    label: "Wireframe",
    config: { line: { linewidth: 1.5, colorscheme: "elem" } },
  },
  stickFigure: {
    label: "Stick Figure",
    config: { stick: { radius: 0.1, colorscheme: "elem" } },
  },
};

const initialStyles: StylesState = {
  ballAndStick: true,
  spacefill: false,
  wireframe: false,
  stickFigure: false,
};

const exampleGlycans = [
  "Gal(b1-4)GlcNAc",
  "Neu5Ac(a2-3)Gal(b1-4)[Fuc(a1-3)]GlcNAc",
];

// ── Component ────────────────────────────────────────────────────────────────
const VisualizePage: React.FC = () => {
  const [glycanSeq, setGlycanSeq] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewLoaded, setViewLoaded] = useState(false);
  const [styles, setStyles] = useState<StylesState>({ ...initialStyles });
  const [viewer, setViewer] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getStyleObject = (): StyleConfig => {
    const key = Object.keys(styles).find(
      (k) => styles[k as keyof StylesState] && styleDefinitions[k]
    );
    return key ? styleDefinitions[key].config : {};
  };

  const loadStructure = async () => {
    if (!glycanSeq.trim()) {
      setMessage("Please enter a glycan sequence.");
      return;
    }
    setLoading(true);
    setMessage("");
    setViewLoaded(false);
    setViewer(null);
    if (containerRef.current) containerRef.current.innerHTML = "";
    setStyles({ ...initialStyles });

    try {
      const res = await axios.post<VisualizationResponse>(
        `${BASE_URL}/api/visualize`,
        { iupac: glycanSeq }
      );
      const { molBlock } = res.data;
      if (!containerRef.current) {
        setMessage("Viewer container not found.");
        return;
      }
      const newViewer = new $3Dmol.GLViewer(containerRef.current, {
        backgroundColor: "#0f172a",
      });
      newViewer.addModel(molBlock, "mol");
      newViewer.setStyle({}, getStyleObject());
      newViewer.addSurface($3Dmol.SurfaceType.VDW, {
        opacity: 0.12,
        color: "white",
      });
      newViewer.zoomTo();
      newViewer.render();
      setViewer(newViewer);
      setViewLoaded(true);
    } catch {
      setMessage(
        "Failed to visualize glycan. Check the sequence format and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewer && viewLoaded) {
      viewer.setStyle({}, getStyleObject());
      viewer.render();
    }
  }, [styles]);

  const handleReset = () => {
    setViewLoaded(false);
    setGlycanSeq("");
    setMessage("");
    setStyles({ ...initialStyles });
    setViewer(null);
    if (containerRef.current) containerRef.current.innerHTML = "";
  };

  const toggleStyle = (key: string) => {
    const next = {} as StylesState;
    for (const k in initialStyles) next[k as keyof StylesState] = false;
    next[key as keyof StylesState] = true;
    setStyles(next);
  };

  const resetView = () => {
    if (viewer && viewLoaded) { viewer.zoomTo(); viewer.render(); }
  };

  const saveScreenshot = () => {
    if (viewer && viewLoaded) {
      const link = document.createElement("a");
      link.href = viewer.pngURI();
      link.download = `glycan_${glycanSeq.replace(/\W/g, "_") || "structure"}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <FaCubes className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">
              Glycan 3D Representation
            </h1>
            <p className="text-sm text-slate-500">
              Visualize glycan structures in 3D from IUPAC-condensed sequences
            </p>
          </div>
        </div>
      </div>

      {/* ── Main two-column layout ───────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pb-12 grid lg:grid-cols-[360px,1fr] gap-6 items-start">

        {/* ── Left panel ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Input card */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-widest">
              Input
            </h2>

            <div className="relative">
              <input
                type="text"
                value={glycanSeq}
                onChange={(e) => { setGlycanSeq(e.target.value); setMessage(""); }}
                onKeyDown={(e) => e.key === "Enter" && loadStructure()}
                placeholder="e.g. Gal(b1-4)GlcNAc"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
              />
              {glycanSeq && (
                <button
                  onClick={() => { setGlycanSeq(""); setMessage(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {message && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            {/* Examples */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Quick examples</p>
              <div className="flex flex-col gap-2">
                {exampleGlycans.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setGlycanSeq(ex); setMessage(""); }}
                    className="flex items-center gap-2 text-xs font-mono text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-2 rounded-lg transition-colors text-left"
                  >
                    <FaMagic className="flex-shrink-0 text-blue-400" />
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Visualize button */}
            <button
              onClick={loadStructure}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors ${
                loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? (
                <><FaSpinner className="animate-spin" /> Visualizing…</>
              ) : (
                <><FaCubes /> Visualize 3D Structure</>
              )}
            </button>
          </div>

          {/* Style card — only when loaded */}
          {viewLoaded && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-widest">
                Display Style
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(styleDefinitions).map((key) => (
                  <button
                    key={key}
                    onClick={() => toggleStyle(key)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold border transition-all ${
                      styles[key as keyof StylesState]
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    {styleDefinitions[key].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions card — only when loaded */}
          {viewLoaded && (
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 space-y-2">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-widest mb-3">
                Actions
              </h2>
              <button
                onClick={resetView}
                className="w-full flex items-center gap-2 justify-center rounded-xl px-4 py-2.5 text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FaUndoAlt className="text-slate-500" /> Reset View
              </button>
              <button
                onClick={saveScreenshot}
                className="w-full flex items-center gap-2 justify-center rounded-xl px-4 py-2.5 text-sm font-medium border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
              >
                <FaCamera className="text-blue-500" /> Save as PNG
              </button>
              <button
                onClick={handleReset}
                className="w-full flex items-center gap-2 justify-center rounded-xl px-4 py-2.5 text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <FaTrashAlt className="text-red-400" /> Clear & Reset
              </button>
            </div>
          )}
        </div>

        {/* ── Right: 3D viewer ─────────────────────────────────────────── */}
        <div className="relative">
          {/* Viewer container */}
          <div
            className={`rounded-2xl overflow-hidden border shadow-xl transition-all duration-300 ${
              viewLoaded ? "border-slate-200" : "border-dashed border-slate-300"
            }`}
            style={{ height: "580px", background: viewLoaded ? "#0f172a" : undefined }}
          >
            {/* Empty state */}
            {!viewLoaded && !loading && (
              <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 gap-4">
                <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <FaCubes className="text-blue-400 text-4xl" />
                </div>
                <div className="text-center">
                  <p className="text-slate-600 font-medium text-sm">No structure loaded</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Enter a glycan sequence and click Visualize
                  </p>
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {loading && (
              <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 gap-3">
                <FaSpinner className="animate-spin text-blue-500 text-3xl" />
                <p className="text-blue-600 text-sm font-medium">
                  Building 3D structure…
                </p>
              </div>
            )}

            {/* 3DMol target div — always mounted so ref is stable */}
            <div
              ref={containerRef}
              style={{
                width: "100%",
                height: "100%",
                display: viewLoaded ? "block" : "none",
              }}
            />
          </div>

          {/* Sequence badge overlay when loaded */}
          {viewLoaded && (
            <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs font-mono px-3 py-1.5 rounded-lg max-w-[80%] truncate">
              {glycanSeq}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualizePage;
