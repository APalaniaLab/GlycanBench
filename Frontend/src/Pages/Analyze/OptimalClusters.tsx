import React, { useState } from "react";
import { BASE_URL } from "../../utils/const";
import { FaMagic, FaChartLine } from "react-icons/fa";

interface Glycan { name: string; iupac: string; }

interface ClusterResult {
  status: string;
  dendrogram?: string;
  image?: string;
  heatmap?: string;
  clusters?: Record<string, string[]>;
  mode?: string;
  elbow_plot?: string;
  threshold_curve?: Array<{ threshold: number; n_clusters: number }>;
  error?: string;
}

const DEFAULT_GLYCANS: Glycan[] = [
  { name: "Glucose", iupac: "Glc" },
  { name: "Galactose", iupac: "Gal" },
  { name: "Mannose", iupac: "Man" },
  { name: "GlcNAc", iupac: "GlcNAc" },
  { name: "GalNAc", iupac: "GalNAc" },
  { name: "Lactose", iupac: "Gal(b1-4)Glc" },
];

const OptimalClusters: React.FC = () => {
  const [glycans, setGlycans] = useState<Glycan[]>(DEFAULT_GLYCANS);

  // ── Clustering method toggle ──────────────────────────────────────
  const [clusteringMethod, setClusteringMethod] = useState<"agglomerative" | "kmeans">("agglomerative");

  // Agglomerative params
  const [distanceThreshold, setDistanceThreshold] = useState<number>(0.5);
  const [linkageMethod, setLinkageMethod] = useState<string>("average");

  // K-means params
  const [nClusters, setNClusters] = useState<number>(3);

  // Shared params
  const [metric, setMetric] = useState<string>("tanimoto");
  const [fingerprintType, setFingerprintType] = useState<string>("morgan");
  const [radius, setRadius] = useState<number>(2);
  const [nBits, setNBits] = useState<number>(2048);

  const [dendrogram, setDendrogram] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [elbowPlot, setElbowPlot] = useState<string | null>(null);
  const [thresholdCurve, setThresholdCurve] = useState<Array<{ threshold: number; n_clusters: number }>>([]);

  const handleGlycanChange = (index: number, field: keyof Glycan, value: string) => {
    const next = [...glycans]; next[index][field] = value; setGlycans(next);
  };
  const addGlycanRow = () => setGlycans((prev) => [...prev, { name: "", iupac: "" }]);
  const removeGlycanRow = (index: number) => setGlycans((prev) => prev.filter((_, i) => i !== index));

  const handleMagicFill = () => {
    setGlycans(DEFAULT_GLYCANS);
    setClusteringMethod("agglomerative");
    setDistanceThreshold(0.5); setLinkageMethod("average"); setNClusters(3);
    setMetric("tanimoto"); setFingerprintType("morgan"); setRadius(2); setNBits(2048);
    setError(""); setElbowPlot(null); setThresholdCurve([]);
    setDendrogram(null); setHeatmap(null); setClusters({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    setDendrogram(null); setHeatmap(null); setClusters({});
    setElbowPlot(null); setThresholdCurve([]);

    try {
      const response = await fetch(`${BASE_URL}/api/cluster/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          glycans,
          clustering_method: clusteringMethod,
          distance_threshold: distanceThreshold,
          linkage_method: linkageMethod,
          n_clusters: nClusters,
          metric, fingerprint_type: fingerprintType, radius, n_bits: nBits,
          mode: "optimal_k",
        }),
      });

      const result: ClusterResult = await response.json();

      if (response.ok && result.status === "success") {
        const dendroBase64 = result.dendrogram || result.image || null;
        if (dendroBase64) setDendrogram(`data:image/png;base64,${dendroBase64}`);
        if (result.heatmap) setHeatmap(`data:image/png;base64,${result.heatmap}`);
        setClusters(result.clusters || {});
        if (result.elbow_plot) setElbowPlot(`data:image/png;base64,${result.elbow_plot}`);
        if (Array.isArray(result.threshold_curve)) setThresholdCurve(result.threshold_curve);
      } else {
        setError(result.error || "Unknown error occurred");
      }
    } catch {
      setError("Failed to reach the clustering server.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImageDataUrl = (dataUrl: string | null, filename: string) => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleDownloadClustersCsv = () => {
    if (!clusters || Object.keys(clusters).length === 0) return;
    const lines = ["cluster_id,glycan_name"];
    Object.entries(clusters).sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([cid, members]) => members.forEach((name) => lines.push(`${cid},${name}`)));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", "glycan_clusters.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FaChartLine className="text-3xl text-green-600" />
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Find Optimal Number of Clusters</h1>
        </div>
        <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
          Analyze threshold sweep to determine the optimal number of clusters using elbow method.
          Visualize how cluster count changes with distance threshold.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Left: form */}
        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-slate-100 p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-800">Input Glycans</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleMagicFill}
                className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors">
                <FaMagic className="text-[13px]" /><span>Magic fill</span>
              </button>
              <button type="button" onClick={addGlycanRow}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors">
                <span className="text-base leading-none">＋</span>Add glycan
              </button>
            </div>
          </div>

          {/* Glycan rows */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {glycans.map((g, idx) => (
              <div key={idx} className="grid grid-cols-[1.5fr,3fr,auto] gap-2 items-center">
                <input type="text" value={g.name} onChange={(e) => handleGlycanChange(idx, "name", e.target.value)}
                  placeholder="Name" required
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" value={g.iupac || ""} onChange={(e) => handleGlycanChange(idx, "iupac", e.target.value)}
                  placeholder="IUPAC (e.g. Glc, Gal(b1-4)Glc)" required
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => removeGlycanRow(idx)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">✕</button>
              </div>
            ))}
          </div>

          {/* ── Clustering method toggle ── */}
          <div className="pt-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Clustering method</label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-medium">
              <button type="button" onClick={() => setClusteringMethod("agglomerative")}
                className={`flex-1 py-2 transition-colors ${clusteringMethod === "agglomerative" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                Agglomerative
              </button>
              <button type="button" onClick={() => setClusteringMethod("kmeans")}
                className={`flex-1 py-2 transition-colors border-l border-slate-200 ${clusteringMethod === "kmeans" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                K-means
              </button>
            </div>
          </div>

          {/* ── Method-specific param ── */}
          {clusteringMethod === "agglomerative" ? (
            <div>
              <label className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">Distance threshold</span>
                <span className="text-xs font-mono text-slate-500">{distanceThreshold.toFixed(2)}</span>
              </label>
              <input type="range" min="0.1" max="1" step="0.01" value={distanceThreshold}
                onChange={(e) => setDistanceThreshold(parseFloat(e.target.value))} className="w-full accent-blue-600" />
              <p className="mt-1 text-[11px] text-slate-500">Starting point for threshold sweep analysis.</p>
            </div>
          ) : (
            <div>
              <label className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">Number of clusters (k)</span>
                <span className="text-xs font-mono text-slate-500">{nClusters}</span>
              </label>
              <input type="range" min="2" max={Math.max(2, glycans.length - 1)} step="1" value={nClusters}
                onChange={(e) => setNClusters(parseInt(e.target.value, 10))} className="w-full accent-blue-600" />
              <p className="mt-1 text-[11px] text-slate-500">Specify k for k-means. Must be ≥ 2 and &lt; number of glycans.</p>
            </div>
          )}

          {/* Advanced options */}
          <div className="border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setShowAdvanced((s) => !s)}
              className="flex w-full items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900">
              <span>Advanced options</span><span>{showAdvanced ? "▴" : "▾"}</span>
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fingerprint type</label>
                  <select value={fingerprintType} onChange={(e) => setFingerprintType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="morgan">Morgan</option>
                    <option value="atom_pair">Atom-pair</option>
                    <option value="torsion">Topological torsion</option>
                    <option value="rdkit">RDKit</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Radius</label>
                    <select value={radius} onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value={2}>2</option><option value={3}>3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">n_bits</label>
                    <select value={nBits} onChange={(e) => setNBits(parseInt(e.target.value, 10))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value={2048}>2048</option><option value={1024}>1024</option>
                    </select>
                  </div>
                </div>
                {clusteringMethod === "agglomerative" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Linkage method</label>
                    <select value={linkageMethod} onChange={(e) => setLinkageMethod(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="average">Average</option>
                      <option value="single">Single</option>
                      <option value="complete">Complete</option>
                      <option value="ward">Ward</option>
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">Note: Ward linkage uses Euclidean-like distance.</p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Similarity / distance metric</label>
                  <select value={metric} onChange={(e) => setMetric(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="tanimoto">Tanimoto</option>
                    <option value="dice">Dice</option>
                    <option value="cosine">Cosine</option>
                    <option value="euclidean">Euclidean-like</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 space-y-2">
            <button type="submit" disabled={loading}
              className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {loading ? "Analyzing optimal clusters…" : "Find optimal clusters"}
            </button>
            {error && <p className="text-xs text-center text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          </div>
        </form>

        {/* Right: results */}
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-slate-100 p-5 md:p-6 min-h-[180px]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-800">Cluster assignments</h2>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">{clusteringMethod}</span>
            </div>
            {Object.keys(clusters || {}).length === 0 ? (
              <p className="text-sm text-slate-500">Run the analysis to see optimal cluster memberships here.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {Object.entries(clusters).sort(([a], [b]) => Number(a) - Number(b)).map(([cid, members]) => (
                  <li key={cid} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
                    <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">{cid}</span>
                    <span className="text-slate-700"><span className="font-semibold mr-1">Cluster {cid}:</span>{members.join(", ")}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-slate-100 pt-3">
              <button type="button" onClick={handleDownloadClustersCsv} disabled={!clusters || Object.keys(clusters).length === 0}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold border ${!clusters || Object.keys(clusters).length === 0 ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}>
                ⬇ Download cluster assignments (CSV)
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-1 gap-4">
            {/* Elbow plot */}
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-800">Cluster count vs threshold (elbow plot)</h3>
                <button type="button" onClick={() => downloadImageDataUrl(elbowPlot, "cluster_elbow_plot.png")} disabled={!elbowPlot}
                  className={`text-[11px] rounded-full px-2 py-1 border ${elbowPlot ? "border-slate-300 text-slate-700 hover:bg-slate-100" : "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"}`}>⬇ PNG</button>
              </div>
              {elbowPlot ? (
                <img src={elbowPlot} alt="Elbow plot" className="mx-auto rounded-lg shadow max-h-[420px] w-full object-contain" />
              ) : (
                <p className="text-xs text-slate-500">The elbow plot will appear here after analysis.</p>
              )}
              {thresholdCurve.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <h4 className="text-xs font-semibold text-slate-800 mb-2">Threshold sweep results</h4>
                  <table className="min-w-full text-[11px] text-left">
                    <thead><tr className="border-b border-slate-200">
                      <th className="py-1 pr-4 font-semibold text-slate-700">Threshold</th>
                      <th className="py-1 font-semibold text-slate-700"># Clusters</th>
                    </tr></thead>
                    <tbody>
                      {thresholdCurve.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-1 pr-4 text-slate-700">{row.threshold.toFixed(2)}</td>
                          <td className="py-1 text-slate-700">{row.n_clusters}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dendrogram — agglomerative only */}
            {clusteringMethod === "agglomerative" && (
              <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-slate-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800">Dendrogram</h3>
                  <button type="button" onClick={() => downloadImageDataUrl(dendrogram, "glycan_dendrogram.png")} disabled={!dendrogram}
                    className={`text-[11px] rounded-full px-2 py-1 border ${dendrogram ? "border-slate-300 text-slate-700 hover:bg-slate-100" : "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"}`}>⬇ PNG</button>
                </div>
                {dendrogram ? <img src={dendrogram} alt="Dendrogram" className="mx-auto rounded-lg shadow max-h-[420px] w-full object-contain" />
                  : <p className="text-xs text-slate-500">The dendrogram will appear here after analysis.</p>}
              </div>
            )}

            {/* Heatmap */}
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-800">Pairwise distance heatmap</h3>
                <button type="button" onClick={() => downloadImageDataUrl(heatmap, "glycan_heatmap.png")} disabled={!heatmap}
                  className={`text-[11px] rounded-full px-2 py-1 border ${heatmap ? "border-slate-300 text-slate-700 hover:bg-slate-100" : "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50"}`}>⬇ PNG</button>
              </div>
              {heatmap ? <img src={heatmap} alt="Heatmap" className="mx-auto rounded-lg shadow max-h-[420px] w-full object-contain" />
                : <p className="text-xs text-slate-500">The pairwise distance heatmap will appear here after analysis.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimalClusters;
