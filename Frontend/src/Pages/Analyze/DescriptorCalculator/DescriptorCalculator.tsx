import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMagic,
  FaCalculator,
  FaDownload,
  FaExternalLinkAlt,
  FaFlask,
  FaAtom,
  FaRing,
  FaWeight,
  FaDna,
  FaLayerGroup,
} from "react-icons/fa";
import { FaSpinner } from "react-icons/fa";
import { BASE_URL } from "../../../utils/const";

// ── Types ────────────────────────────────────────────────────────────────────
interface DescriptorMeta {
  Format?: string;
  Input?: string;
  Canonical_IUPAC?: string;
  SMILES?: string;
}
interface DescriptorProperties {
  [key: string]: string | number | boolean | null | undefined;
}
interface DescriptorResult {
  meta: DescriptorMeta;
  properties: DescriptorProperties;
}

// ── Descriptor groups with icons ─────────────────────────────────────────────
const groups: {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  keys: string[];
}[] = [
  {
    key: "weight",
    label: "Molecular Weight",
    icon: <FaWeight />,
    color: "blue",
    keys: ["Molecular_Weight", "Exact_Molecular_Weight", "Heavy_Atom_Count", "Molar_Refractivity"],
  },
  {
    key: "rings",
    label: "Ring Systems",
    icon: <FaRing />,
    color: "violet",
    keys: ["Ring_Count", "Aliphatic_Rings", "Aromatic_Rings", "Saturated_Rings"],
  },
  {
    key: "bonds",
    label: "Bonds & H-Bonding",
    icon: <FaAtom />,
    color: "sky",
    keys: ["Num_Rotatable_Bonds", "H_Bond_Acceptors", "H_Bond_Donors"],
  },
  {
    key: "atoms",
    label: "Atom Counts",
    icon: <FaLayerGroup />,
    color: "emerald",
    keys: ["Num_Atoms", "Num_Heteroatoms", "NHOH_Count", "NO_Count"],
  },
  {
    key: "physchem",
    label: "Physicochemical",
    icon: <FaFlask />,
    color: "amber",
    keys: ["TPSA", "LogP", "Fraction_Csp3", "Molecular_Formula"],
  },
  {
    key: "stereo",
    label: "Stereochemistry",
    icon: <FaDna />,
    color: "rose",
    keys: ["Num_Stereo_Centers", "Num_Unspecified_Stereo_Centers"],
  },
  {
    key: "motifs",
    label: "Glycan Motifs",
    icon: <FaFlask />,
    color: "teal",
    keys: ["Pyranose_Rings", "Furanose_Rings", "N_Acetyl_Groups", "Carboxyl_Groups", "Sulfate_Groups"],
  },
  {
    key: "composition",
    label: "Elemental Composition",
    icon: <FaAtom />,
    color: "indigo",
    keys: ["Count_C", "Count_H", "Count_O", "Count_N", "O_N_Ratio"],
  },
];

const descriptions: Record<string, string> = {
  Molecular_Weight: "Average molecular weight (Da)",
  Exact_Molecular_Weight: "Monoisotopic molecular weight (Da)",
  Heavy_Atom_Count: "Number of non-hydrogen atoms",
  Molar_Refractivity: "Measure of molecular polarizability",
  Ring_Count: "Total number of rings",
  Aliphatic_Rings: "Non-aromatic ring count",
  Aromatic_Rings: "Aromatic ring count",
  Saturated_Rings: "Saturated ring count",
  Num_Rotatable_Bonds: "Freely rotating bonds",
  H_Bond_Acceptors: "H-bond acceptor atoms",
  H_Bond_Donors: "H-bond donor atoms",
  Num_Atoms: "Total atom count (with H)",
  Num_Heteroatoms: "Non-C, non-H atoms",
  NHOH_Count: "NH or OH group count",
  NO_Count: "N + O atom count",
  TPSA: "Topological polar surface area (Å²)",
  LogP: "Hydrophobicity (log octanol/water)",
  Fraction_Csp3: "Fraction of sp³ carbons",
  Molecular_Formula: "Elemental formula",
  Num_Stereo_Centers: "Total stereocenters",
  Num_Unspecified_Stereo_Centers: "Unspecified stereocenters",
  Pyranose_Rings: "6-membered sugar rings",
  Furanose_Rings: "5-membered sugar rings",
  N_Acetyl_Groups: "N-acetyl groups (GlcNAc, GalNAc)",
  Carboxyl_Groups: "Carboxylic acid groups",
  Sulfate_Groups: "Sulfate groups",
  Count_C: "Carbon atoms",
  Count_H: "Hydrogen atoms",
  Count_O: "Oxygen atoms",
  Count_N: "Nitrogen atoms",
  O_N_Ratio: "Oxygen-to-nitrogen ratio",
};

const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-100",   badge: "bg-blue-100 text-blue-700" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-100", badge: "bg-violet-100 text-violet-700" },
  sky:    { bg: "bg-sky-50",    text: "text-sky-700",    border: "border-sky-100",    badge: "bg-sky-100 text-sky-700" },
  emerald:{ bg: "bg-emerald-50",text: "text-emerald-700",border: "border-emerald-100",badge: "bg-emerald-100 text-emerald-700" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-100",  badge: "bg-amber-100 text-amber-700" },
  rose:   { bg: "bg-rose-50",   text: "text-rose-700",   border: "border-rose-100",   badge: "bg-rose-100 text-rose-700" },
  teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-100",   badge: "bg-teal-100 text-teal-700" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100", badge: "bg-indigo-100 text-indigo-700" },
};

const formatVal = (v: string | number | boolean | null | undefined): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? v.toString() : v.toFixed(3);
  return String(v);
};

const EXAMPLE = "Man(a1-4)GlcNAc(b1-4)GlcNAc";

// ── Sub-components ────────────────────────────────────────────────────────────
const DescriptorRow: React.FC<{
  label: string;
  value: string | number | boolean | null | undefined;
  desc: string;
}> = ({ label, value, desc }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 group">
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-slate-700 truncate">{label.replace(/_/g, " ")}</p>
      <p className="text-[10px] text-slate-400 truncate">{desc}</p>
    </div>
    <span className="ml-3 text-sm font-semibold text-slate-800 font-mono whitespace-nowrap">
      {formatVal(value)}
    </span>
  </div>
);

const GroupCard: React.FC<{
  group: typeof groups[0];
  properties: DescriptorProperties;
  delay: number;
}> = ({ group, properties, delay }) => {
  const c = colorMap[group.color];
  const rows = group.keys
    .map((k) => ({ key: k, value: properties[k] ?? properties[k.replace(/_/g, " ")] }))
    .filter((r) => r.value !== undefined);

  if (rows.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`rounded-2xl border ${c.border} ${c.bg} p-4`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${c.badge}`}>
          {group.icon}
        </span>
        <h3 className={`text-sm font-semibold ${c.text}`}>{group.label}</h3>
        <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
          {rows.length}
        </span>
      </div>
      <div>
        {rows.map((r) => (
          <DescriptorRow
            key={r.key}
            label={r.key}
            value={r.value}
            desc={descriptions[r.key] || "Calculated property"}
          />
        ))}
      </div>
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const DescriptorCalculator: React.FC = () => {
  const [sequence, setSequence] = useState("");
  const [result, setResult] = useState<DescriptorResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const handleSubmit = async () => {
    if (sequence.trim().length < 3) {
      setError("Please enter a valid IUPAC glycan sequence.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/descriptor`, {
        format: "IUPAC",
        data: sequence.trim(),
        include_fingerprints: false,
      });
      const meta: DescriptorMeta = {
        Format: res.data.Format,
        Input: res.data.Input,
        Canonical_IUPAC: res.data.Canonical_IUPAC,
        SMILES: res.data.SMILES,
      };
      const properties: DescriptorProperties = res.data.Properties || res.data;
      setResult({ meta, properties });
      setActiveTab("all");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Server error — check backend logs"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSequence("");
    setResult(null);
    setError("");
  };

  const downloadCSV = () => {
    if (!result) return;
    const rows = [["Descriptor", "Value", "Description"]];
    groups.forEach((g) =>
      g.keys.forEach((k) => {
        const v = result.properties[k];
        if (v !== undefined) rows.push([k.replace(/_/g, " "), formatVal(v), descriptions[k] || ""]);
      })
    );
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `descriptors_${sequence.replace(/\W/g, "_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const mw = result?.properties?.Molecular_Weight;
  const hba = result?.properties?.H_Bond_Acceptors;
  const hbd = result?.properties?.H_Bond_Donors;
  const rings = result?.properties?.Ring_Count;

  const visibleGroups =
    activeTab === "all"
      ? groups
      : groups.filter((g) => g.key === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <FaCalculator className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">
              Molecule Descriptors
            </h1>
            <p className="text-sm text-slate-500">
              Compute physicochemical and glycan-specific properties from IUPAC sequences
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-12 grid lg:grid-cols-[340px,1fr] gap-6 items-start">

        {/* ── Left: input panel ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Input</h2>

            <textarea
              rows={4}
              value={sequence}
              onChange={(e) => { setSequence(e.target.value); setError(""); }}
              placeholder="Enter IUPAC glycan sequence…&#10;e.g. Man(a1-4)GlcNAc(b1-4)GlcNAc"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Example */}
            <button
              onClick={() => { setSequence(EXAMPLE); setError(""); }}
              className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-100 px-3 py-2 rounded-lg font-mono transition-colors w-full"
            >
              <FaMagic className="flex-shrink-0 text-purple-400" />
              {EXAMPLE}
            </button>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${
                  loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? <><FaSpinner className="animate-spin" /> Calculating…</> : <><FaCalculator /> Calculate</>}
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Meta card — shown after result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 space-y-3"
            >
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Structure Info</h2>

              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-slate-400 mb-0.5">Canonical IUPAC</p>
                  <p className="font-mono text-slate-700 break-all leading-relaxed">
                    {result.meta.Canonical_IUPAC || result.meta.Input}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-0.5">SMILES</p>
                  <p className="font-mono text-slate-500 break-all text-[10px] leading-relaxed line-clamp-3">
                    {result.meta.SMILES}
                  </p>
                </div>
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(result.meta.SMILES || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <FaExternalLinkAlt className="text-[10px]" /> View on PubChem
                </a>
              </div>

              <button
                onClick={downloadCSV}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <FaDownload className="text-slate-400" /> Download CSV
              </button>
            </motion.div>
          )}

          {/* Summary stats */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-md border border-slate-100 p-5"
            >
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Quick Stats</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Mol. Weight", value: mw !== undefined ? `${formatVal(mw)} Da` : "—", color: "blue" },
                  { label: "Rings", value: formatVal(rings), color: "violet" },
                  { label: "HBA", value: formatVal(hba), color: "sky" },
                  { label: "HBD", value: formatVal(hbd), color: "emerald" },
                ].map((s) => {
                  const c = colorMap[s.color];
                  return (
                    <div key={s.label} className={`rounded-xl p-3 ${c.bg} border ${c.border}`}>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${c.text}`}>{s.label}</p>
                      <p className={`text-lg font-bold ${c.text} mt-0.5`}>{s.value}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right: results ──────────────────────────────────────────── */}
        <div>
          {!result && !loading && (
            <div className="h-80 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <FaCalculator className="text-blue-300 text-3xl" />
              </div>
              <div className="text-center">
                <p className="text-slate-500 font-medium text-sm">No descriptors yet</p>
                <p className="text-slate-400 text-xs mt-1">Enter a glycan sequence and click Calculate</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-80 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white gap-3">
              <FaSpinner className="animate-spin text-blue-500 text-3xl" />
              <p className="text-blue-600 text-sm font-medium">Computing descriptors…</p>
            </div>
          )}

          {result && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Tab bar */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      activeTab === "all"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    All
                  </button>
                  {groups.map((g) => {
                    const hasData = g.keys.some(
                      (k) => result.properties[k] !== undefined
                    );
                    if (!hasData) return null;
                    const c = colorMap[g.color];
                    return (
                      <button
                        key={g.key}
                        onClick={() => setActiveTab(g.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          activeTab === g.key
                            ? `${c.badge} border-transparent`
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>

                {/* Cards grid */}
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleGroups.map((g, i) => (
                    <GroupCard
                      key={g.key}
                      group={g}
                      properties={result.properties}
                      delay={i * 0.05}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

export default DescriptorCalculator;
