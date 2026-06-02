import React, { useState } from "react";
import axios from "axios";
import { BASE_URL, getErrorMessage } from "../../../utils/const";
import { FaMagic } from "react-icons/fa";
import { IoHelpCircleSharp } from "react-icons/io5";

// ========== Types ==========
interface ComparisonResult {
  SMILES_1: string;
  SMILES_2: string;
  similarities: Record<string, number>;
}

const fingerprintOptions: string[] = [
  "Morgan_R2",
  "Morgan_R3",
  "AtomPair",
  "Torsion",
  "RDKit",
];

const fingerprintExplanations: Record<string, string> = {
  Morgan_R2: "Morgan (radius 2) fingerprint captures circular substructures up to 2 bonds away.",
  Morgan_R3: "Morgan (radius 3) fingerprint captures circular substructures up to 3 bonds away.",
  AtomPair: "Atom Pair fingerprint encodes pairs of atoms and the topological distance between them.",
  Torsion: "Topological Torsion fingerprint encodes sequences of four sequential atoms.",
  RDKit: "RDKit fingerprint encodes linear molecular paths up to a certain length.",
};

const CompareGlycans: React.FC = () => {
  const [glycan1, setGlycan1] = useState<string>("");
  const [glycan2, setGlycan2] = useState<string>("");
  const [selectedFPs, setSelectedFPs] = useState<string[]>([]);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const convertIUPACtoSMILES = async (iupac: string): Promise<string> => {
    const res = await axios.post(`${BASE_URL}/api/convert`, {
      glycan: iupac,
      input_format: "iupac",
    });
    return res.data.smiles;
  };

  const fillExampleGlycans = () => {
    setGlycan1("GlcNAc(b1-6)[Gal(b1-3)]GalNAc");
    setGlycan2("Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc");
  };

  const handleFPSelect = (fp: string) => {
    if (fp === "ALL") {
      if (selectedFPs.length === fingerprintOptions.length) {
        setSelectedFPs([]); // toggle off
      } else {
        setSelectedFPs(fingerprintOptions);
      }
      return;
    }
    setSelectedFPs((prev) =>
      prev.includes(fp) ? prev.filter((f) => f !== fp) : [...prev, fp]
    );
  };

  const handleCompare = async () => {
    if (!glycan1 || !glycan2) return setError("⚠️ Please enter both glycans.");
    if (selectedFPs.length === 0) return setError("⚠️ Select at least one fingerprint.");

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const s1 = await convertIUPACtoSMILES(glycan1);
      const s2 = await convertIUPACtoSMILES(glycan2);

      const res = await axios.post(`${BASE_URL}/api/compare_glycans`, {
        smiles1: s1,
        smiles2: s2,
        fingerprints: selectedFPs,
      });

      setResult({
        SMILES_1: s1,
        SMILES_2: s2,
        similarities: res.data,
      });
    } catch (err) {
      setError("❌ " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto bg-white shadow-xl rounded-2xl mt-8 mb-16">
      <h2 className="text-3xl font-bold text-indigo-700 mb-6">
        🧬 Compare Fingerprints
      </h2>

      {/* Glycan Inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Glycan 1 (IUPAC)</label>
          <input
            type="text"
            placeholder="Enter first glycan"
            value={glycan1}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlycan1(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Glycan 2 (IUPAC)</label>
          <input
            type="text"
            placeholder="Enter second glycan"
            value={glycan2}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlycan2(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          type="button"
          onClick={fillExampleGlycans}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <FaMagic className="text-indigo-600" /> Use sample glycans
        </button>
      </div>

      {/* Fingerprint Selector */}
      <h3 className="mt-6 mb-2 text-lg font-semibold text-gray-700">🔍 Select Fingerprint(s)</h3>
      <div className="flex flex-wrap gap-2">
        {fingerprintOptions.map((fp) => (
          <button
            key={fp}
            type="button"
            onClick={() => handleFPSelect(fp)}
            className={`px-3 py-1 rounded-lg border hover:bg-indigo-100 ${
              selectedFPs.includes(fp) ? "bg-indigo-500 text-white" : "bg-white"
            }`}
          >
            {fp}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handleFPSelect("ALL")}
          className={`px-3 py-1 rounded-lg border ${
            selectedFPs.length === fingerprintOptions.length ? "bg-indigo-600 text-white" : "bg-white"
          }`}
        >
          Select All
        </button>
      </div>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      <button
        onClick={handleCompare}
        disabled={loading}
        className={`w-full mt-6 py-3 rounded-lg text-white font-semibold ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {loading ? "Comparing..." : "Convert & Compare"}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">🧠 Fingerprint Similarities</h3>
          <p><strong>SMILES 1:</strong> {result.SMILES_1}</p>
          <p className="mb-3"><strong>SMILES 2:</strong> {result.SMILES_2}</p>

          <div className="space-y-2">
            {selectedFPs.map((fp) =>
              result.similarities[fp] !== undefined && (
                <div key={fp} className="flex items-center gap-2 relative group">
                  <strong>{fp}:</strong> {result.similarities[fp].toFixed(4)}
                  <IoHelpCircleSharp className="text-gray-400 cursor-pointer" />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block w-64 bg-gray-800 text-white text-sm p-2 rounded-lg shadow-lg z-50">
                    {fingerprintExplanations[fp]}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompareGlycans;
