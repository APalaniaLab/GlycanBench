import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { FaSpinner, FaCube, FaDna, FaProjectDiagram } from "react-icons/fa";
import { FaBrain } from "react-icons/fa";
import { FaAlignLeft } from "react-icons/fa";
import { FaCodeCompare } from "react-icons/fa6";
import { GrCluster } from "react-icons/gr";
import { motion } from "framer-motion";

// ── Typing animation hook ─────────────────────────────────────────────────────
function useTypingEffect(text: string, speed = 80, startDelay = 400) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(delay);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

interface FeatureCard {
  icon: React.ReactNode;
  label: string;
  description: string;
  to: string;
  filled: boolean;
}

const featureCards: FeatureCard[] = [
  {
    icon: <FaBrain className="text-2xl" />,
    label: "Predict Immunogenicity",
    description: "Graph Neural Network (MPNN) based immunogenicity prediction for glycan sequences",
    to: "/prediction",
    filled: true,
  },
  {
    icon: <GrCluster className="text-2xl" />,
    label: "Cluster Glycans",
    description: "Group glycans by structural similarity using agglomerative or k-means clustering",
    to: "/cluster/multiple",
    filled: true,
  },
  {
    icon: <FaAlignLeft className="text-2xl" />,
    label: "Align Sequences",
    description: "Global pairwise alignment of glycan sequences using the GLYSUM substitution matrix",
    to: "/sequenceAlignment",
    filled: false,
  },
  {
    icon: <FaCodeCompare className="text-2xl" />,
    label: "Compare Fingerprints",
    description: "Tanimoto similarity across Morgan, AtomPair, Torsion and RDKit fingerprints",
    to: "/CompareGlycans",
    filled: false,
  },
];

const Home: React.FC = () => {
  const { displayed: typedText, done: typingDone } = useTypingEffect("GlycanBench", 75, 600);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [currentSource, setCurrentSource] = useState<string>("");
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);

  const glucosePDB = `HEADER    GLUCOSE MOLECULE
ATOM      1  C1  GLC A   1      -1.299   0.750   0.000  1.00 20.00           C  
ATOM      2  C2  GLC A   1      -2.014   0.338   0.000  1.00 20.00           C  
ATOM      3  C3  GLC A   1      -2.014  -0.488   0.000  1.00 20.00           C  
ATOM      4  C4  GLC A   1      -1.299  -0.900   0.000  1.00 20.00           C  
ATOM      5  C5  GLC A   1      -0.585  -0.488   0.000  1.00 20.00           C  
ATOM      6  O5  GLC A   1      -0.585   0.338   0.000  1.00 20.00           O  
CONECT    1    2    6
CONECT    2    1    3
CONECT    3    2    4
CONECT    4    3    5
CONECT    5    4    6
CONECT    6    1    5
END`;

  const sdfSources = [
    "/Conformer3D_COMPOUND_CID_91858297.sdf",
    "/glucose.sdf",
  ];

  const loadWith3DMol = async (): Promise<boolean> => {
    try {
      if (!viewerRef.current) return false;
      const $3Dmol = await import("3dmol");
      if (viewerInstance.current) viewerInstance.current.clear();
      const viewer = $3Dmol.createViewer(viewerRef.current, {
        backgroundColor: "white",
        antialias: true,
      });
      viewerInstance.current = viewer;
      viewer.addModel(glucosePDB, "pdb");
      viewer.setStyle({}, { stick: { radius: 0.3 }, sphere: { radius: 0.5 } });
      viewer.zoomTo();
      viewer.render();
      setCurrentSource("3DMol.js glucose structure");
      return true;
    } catch {
      return false;
    }
  };

  const loadFromFile = async (url: string): Promise<boolean> => {
    try {
      setCurrentSource(`Loading from ${url}...`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const fileData = await response.text();
      if (!viewerRef.current) return false;
      const $3Dmol = await import("3dmol");
      if (viewerInstance.current) viewerInstance.current.clear();
      const viewer = $3Dmol.createViewer(viewerRef.current, {
        backgroundColor: "white",
        antialias: true,
      });
      viewerInstance.current = viewer;
      const format = url.endsWith(".sdf") ? "sdf" : "pdb";
      viewer.addModel(fileData, format);
      viewer.setStyle({}, { stick: { radius: 0.3 }, sphere: { radius: 0.5 } });
      viewer.zoomTo();
      viewer.render();
      setCurrentSource(url);
      return true;
    } catch {
      return false;
    }
  };

  const loadMolecule = async (sources: string[], index = 0): Promise<void> => {
    if (index < sources.length) {
      const ok = await loadFromFile(sources[index]);
      if (ok) { setLoading(false); setLoadError(false); return; }
      setTimeout(() => loadMolecule(sources, index + 1), 1000);
      return;
    }
    const ok = await loadWith3DMol();
    if (ok) { setLoading(false); setLoadError(false); return; }
    setLoadError(true);
    setLoading(false);
  };

  useEffect(() => {
    if (!viewerRef.current) return;
    const t = setTimeout(() => loadMolecule(sdfSources), 200);
    return () => {
      clearTimeout(t);
      if (viewerInstance.current) viewerInstance.current.clear();
    };
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-white overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between px-6 sm:px-10 lg:px-20 pt-16 pb-12 gap-12">

        {/* Left copy */}
        <motion.div
          className="w-full lg:max-w-2xl space-y-6"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Badge */}
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full tracking-wide uppercase">
              <FaDna className="text-blue-500" />
              Glycobiology Research Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-800 leading-tight"
          >
            Welcome to{" "}
            <span className="inline-block">
              {/* Typed portion: Glycan (blue) + Bench (dark) */}
              <span className="text-blue-600">
                {typedText.slice(0, Math.min(typedText.length, 6))}
              </span>
              <span className="text-blue-900">
                {typedText.slice(6)}
              </span>
              {/* Blinking cursor — hidden once typing is done */}
              {!typingDone && (
                <span className="inline-block w-[3px] h-[0.85em] bg-blue-500 ml-0.5 align-middle animate-pulse" />
              )}
            </span>
            <br />
            <span className="text-slate-600 font-semibold text-2xl sm:text-3xl md:text-4xl">
              for glycan analysis and investigation
            </span>
          </motion.h1>

          {/* Sub-copy */}
          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-xl"
          >
            An integrated platform for conception, visualization, analysis,
            alignment, clustering, property prediction, and literature
            exploration in Glycobiology.
          </motion.p>

          {/* CTA buttons — 2 rows */}
          <motion.div variants={fadeUp} className="space-y-3">
            {/* Row 1 — filled */}
            <div className="flex flex-wrap gap-3">
              <Link
                to="/prediction"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium px-5 py-2.5 rounded-xl shadow-md transition-all duration-200 text-sm"
              >
                <FaBrain />
                Predict Immunogenicity
              </Link>
              <Link
                to="/cluster/multiple"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium px-5 py-2.5 rounded-xl shadow-md transition-all duration-200 text-sm"
              >
                <GrCluster />
                Cluster Glycans
              </Link>
            </div>
            {/* Row 2 — outlined */}
            <div className="flex flex-wrap gap-3">
              <Link
                to="/sequenceAlignment"
                className="inline-flex items-center gap-2 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 active:scale-95 font-medium px-5 py-2.5 rounded-xl transition-all duration-200 text-sm"
              >
                <FaAlignLeft />
                Align Sequences
              </Link>
              <Link
                to="/CompareGlycans"
                className="inline-flex items-center gap-2 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 active:scale-95 font-medium px-5 py-2.5 rounded-xl transition-all duration-200 text-sm"
              >
                <FaCodeCompare />
                Compare Fingerprints
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Right — 3D viewer */}
        <motion.div
          className="w-full lg:w-auto flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <div className="relative">
            {/* Decorative glow ring */}
            <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-blue-300 via-blue-200 to-indigo-200 opacity-40 blur-xl" />
            <div
              ref={viewerRef}
              className="relative rounded-[1.75rem] border border-blue-100 shadow-2xl bg-white overflow-hidden"
              style={{ width: 340, height: 340 }}
            >
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10">
                  <FaSpinner className="animate-spin text-blue-500 text-3xl mb-2" />
                  <p className="text-blue-500 text-xs text-center px-4">
                    {currentSource || "Loading 3D glycan structure…"}
                  </p>
                </div>
              )}
              {loadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 z-10 p-6">
                  <FaCube className="text-blue-400 text-4xl mb-3" />
                  <p className="text-blue-700 text-sm font-semibold mb-1">3D Glycan Viewer</p>
                  <p className="text-blue-500 text-xs mb-4 text-center">Unable to load structure</p>
                  <button
                    onClick={() => {
                      setLoadError(false);
                      setLoading(true);
                      setCurrentSource("");
                      loadMolecule(sdfSources);
                    }}
                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Citation strip ───────────────────────────────────────────── */}
      <div className="border-t border-blue-100 bg-white/60 backdrop-blur-sm">
        <p className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-20 py-4 text-xs text-slate-400 text-center">
          Vigneshwaran CJ &amp; Ashok Palaniappan.{" "}
          <em>GlycanBench: a unified resource for working with glycans</em>, 2026 [submitted]
        </p>
      </div>
    </div>
  );
};

export default Home;
