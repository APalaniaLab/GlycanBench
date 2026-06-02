import React, { useState } from "react";
import axios from "axios";
import { FaMagic, FaDownload, FaQuestionCircle } from "react-icons/fa";
import { BASE_URL, getErrorMessage } from "../../../utils/const";

// ========== Types ==========
interface SequencePair {
  seq1: string;
  seq2: string;
}

interface ScoringParams {
  matchScore: number;
  mismatchScore: number;
  openGapScore: number;
  extendGapScore: number;
}

interface AlignmentResult {
  seq1: string;
  seq2: string;
  match_line: string;
  score: number;
  observation: string;
}

const SequenceAlignment: React.FC = () => {
  const [pair, setPair] = useState<SequencePair>({ seq1: "", seq2: "" });
  const [useCustomScoring, setUseCustomScoring] = useState<boolean>(false);
  const [scoringParams, setScoringParams] = useState<ScoringParams>({
    matchScore: 5.0,
    mismatchScore: -5.0,
    openGapScore: -10.0,
    extendGapScore: -2.0,
  });
  const [result, setResult] = useState<AlignmentResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const examplePair: SequencePair = {
    seq1: "GlcNAc(β1-4)Gal(α1-3)Fuc(β1-2)GalNAc",
    seq2: "GlcNAc(β1-4)Gal(α1-3)Fuc(α1-6)Glc",
  };

  const handleInputChange = (field: keyof SequencePair, value: string) => {
    setPair({ ...pair, [field]: value });
  };

  const handleScoringChange = (field: keyof ScoringParams, value: number) => {
    setScoringParams({ ...scoringParams, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const payload = {
        sequence1: pair.seq1.trim(),
        sequence2: pair.seq2.trim(),
        use_custom_scoring: useCustomScoring,
        match_score: scoringParams.matchScore,
        mismatch_score: scoringParams.mismatchScore,
        open_gap_score: scoringParams.openGapScore,
        extend_gap_score: scoringParams.extendGapScore,
      };
      const res = await axios.post(`${BASE_URL}/api/align`, payload);
      setResult(res.data.alignment);
    } catch (err) {
      setError(getErrorMessage(err) || "Failed to align sequences.");
    } finally {
      setLoading(false);
    }
  };

  const applyExample = (example: SequencePair) => {
    setPair({ seq1: example.seq1, seq2: example.seq2 });
    setResult(null);
    setError(null);
  };

  const downloadTXT = () => {
    if (!result) return;

    let content = "";
    content += `Sequence 1: ${pair.seq1}\n`;
    content += `Sequence 2: ${pair.seq2}\n`;
    content += `Aligned 1: ${result.seq1}\n`;
    content += `Match Line: ${result.match_line}\n`;
    content += `Aligned 2: ${result.seq2}\n`;
    content += `Score: ${result.score.toFixed(2)}\n`;
    content += `Observation: ${result.observation}\n`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "glycan_alignment.txt";
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-2xl rounded-xl mt-10 mb-20">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
        🔬 Alignment of glycan sequences
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-lg font-semibold text-gray-700">
              Sequence 1
            </label>
            <textarea
              value={pair.seq1}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange("seq1", e.target.value)}
              className="w-full border border-blue-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="block text-lg font-semibold text-gray-700">
              Sequence 2
            </label>
            <textarea
              value={pair.seq2}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange("seq2", e.target.value)}
              className="w-full border border-blue-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
              rows={3}
              required
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            ⚙️ Alignment Scoring Parameters
          </h3>
          
          <div className="mb-4 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100">
              <input
                type="radio"
                name="scoringMode"
                checked={!useCustomScoring}
                onChange={() => setUseCustomScoring(false)}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-sm font-medium text-gray-700">
                Use GLYSUM substitution matrix for scoring
              </span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-100">
              <input
                type="radio"
                name="scoringMode"
                checked={useCustomScoring}
                onChange={() => setUseCustomScoring(true)}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-sm font-medium text-gray-700">
                Use custom scoring
              </span>
            </label>
          </div>
          
          <div className={`grid md:grid-cols-2 lg:grid-cols-4 gap-4 ${!useCustomScoring ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Match Score
                <div className="relative group">
                  <FaQuestionCircle className="text-blue-500 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    Score awarded when two glycan elements match exactly. Higher values favor alignments with more matches. (Only used with custom scoring)
                  </div>
                </div>
              </label>
              <input
                type="number"
                step="0.1"
                value={scoringParams.matchScore}
                onChange={(e) => handleScoringChange("matchScore", parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Mismatch Score
                <div className="relative group">
                  <FaQuestionCircle className="text-blue-500 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    Penalty applied when two glycan elements don't match. Typically negative to discourage mismatches. (Only used with custom scoring)
                  </div>
                </div>
              </label>
              <input
                type="number"
                step="0.1"
                value={scoringParams.mismatchScore}
                onChange={(e) => handleScoringChange("mismatchScore", parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Gap Open Penalty
                <div className="relative group">
                  <FaQuestionCircle className="text-blue-500 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    Penalty for starting a new gap in the alignment. More negative values make gaps less likely.
                  </div>
                </div>
              </label>
              <input
                type="number"
                step="0.1"
                value={scoringParams.openGapScore}
                onChange={(e) => handleScoringChange("openGapScore", parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                Gap Extend Penalty
                <div className="relative group">
                  <FaQuestionCircle className="text-blue-500 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                    Penalty for extending an existing gap. Usually less negative than gap open penalty to allow longer gaps once started.
                  </div>
                </div>
              </label>
              <input
                type="number"
                step="0.1"
                value={scoringParams.extendGapScore}
                onChange={(e) => handleScoringChange("extendGapScore", parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 px-6 rounded-full text-lg font-semibold hover:opacity-90"
        >
          {loading ? "Aligning..." : "Align Sequences"}
        </button>
      </form>

      {result && (
        <div className="mt-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-blue-700">🧬 Result</h3>
            <button
              onClick={downloadTXT}
              className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700"
            >
              <FaDownload className="inline mr-2" /> Export TXT
            </button>
          </div>

          <div className="mt-6 p-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
            <pre className="whitespace-pre-wrap font-mono">{result.seq1}</pre>
            <pre className="whitespace-pre-wrap font-mono text-green-700">
              {result.match_line}
            </pre>
            <pre className="whitespace-pre-wrap font-mono">{result.seq2}</pre>
            <p className="mt-2 text-lg font-semibold text-blue-700">
              🎯 Score:{" "}
              <span className="text-black">{result.score.toFixed(2)}</span>
            </p>
            <p className="text-md text-gray-700">🧪 {result.observation}</p>
          </div>
        </div>
      )}

      {error && <p className="text-red-600 mt-4 font-semibold">{error}</p>}

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          ✨ Try an Example:
        </h2>
        <button
          onClick={() => applyExample(examplePair)}
          className="bg-gray-100 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg shadow"
        >
          <FaMagic className="inline mr-2" /> Example
        </button>
      </div>
    </div>
  );
};

export default SequenceAlignment;
