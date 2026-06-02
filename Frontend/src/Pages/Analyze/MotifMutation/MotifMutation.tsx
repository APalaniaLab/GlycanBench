import React, { useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { FiHelpCircle } from "react-icons/fi";
import { FaMagic, FaMicroscope } from "react-icons/fa";
import { BASE_URL } from "../../../utils/const";

// TypeScript interfaces
interface MotifFrequencies {
  [motif: string]: number;
}

interface MotifResponse {
  motif_frequencies: MotifFrequencies;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
  }[];
}

interface HelpModalProps {
  onClose: () => void;
  expandedSteps: number[];
  toggleStep: (idx: number) => void;
}

interface StepContent {
  title: string;
  content: React.ReactNode;
}

// =================== Help Modal ===================
const HelpModal: React.FC<HelpModalProps> = ({ onClose, expandedSteps, toggleStep }) => {
  const steps: StepContent[] = [
    {
      title: "1. Input Parsing & Tokenization",
      content: (
        <>
          <p>
            The input glycan sequence is split into a list of sugar units and
            bond types, removing brackets and special characters.
          </p>
          <pre className="bg-gray-100 p-2 rounded mt-2 text-sm overflow-x-auto">
            {`Example: 
"GlcNAc(b1-4)Gal(b1-3)" 
→ ["GlcNAc", "b1-4", "Gal", "b1-3"]`}
          </pre>
        </>
      ),
    },
    {
      title: "2. Mutation Simulation",
      content: (
        <>
          <p>
            Depending on the mutation depth and mode, random sugars or bonds are
            replaced in the sequence at randomly selected positions.
          </p>
          <p>
            Positions alternate between sugars (even indices) and bonds (odd
            indices).
          </p>
          <pre className="bg-gray-100 p-2 rounded mt-2 text-sm overflow-x-auto">
            {`For each mutant:
- Select positions to mutate
- Replace with random sugar or bond`}
          </pre>
        </>
      ),
    },
    {
      title: "3. Motif Extraction",
      content: (
        <>
          <p>
            Mutated sequences are scanned for motifs — fixed-length sliding
            windows of sugars + bonds (length 5 units).
          </p>
          <pre className="bg-gray-100 p-2 rounded mt-2 text-sm overflow-x-auto">
            {`Extract motifs:
["GlcNAc*b1-4*Gal*b1-3*GlcNAc", ...]`}
          </pre>
        </>
      ),
    },
    {
      title: "4. Frequency Counting",
      content: (
        <>
          <p>
            All motifs from all mutants are combined and counted to produce
            frequency statistics.
          </p>
          <pre className="bg-gray-100 p-2 rounded mt-2 text-sm overflow-x-auto">
            {`Count occurrences:
{
  "GlcNAc*b1-4*Gal*b1-3*GlcNAc": 42,
  "Gal*b1-3*GlcNAc*b1-6*Gal": 37,
  ...
}`}
          </pre>
        </>
      ),
    },
    {
      title: "5. Visualization",
      content: (
        <p>
          Frequencies are sent back to the frontend and displayed in a bar chart
          for visual interpretation of motif conservation under mutation.
        </p>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 z-50 bg-black/30 backdrop-blur-sm">
      <div className="bg-white bg-opacity-90 rounded-lg p-6 max-w-lg shadow-lg relative max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 font-bold text-xl"
        >
          ×
        </button>
        <h3 className="text-lg font-semibold mb-4 text-center">
          Help: How Motif Frequencies are Calculated
        </h3>
        {steps.map(({ title, content }, idx) => (
          <div key={idx} className="mb-4 border border-gray-300 rounded">
            <button
              onClick={() => toggleStep(idx)}
              className="w-full text-left px-4 py-2 font-semibold bg-gray-200 hover:bg-gray-300 flex justify-between items-center"
            >
              <span>{title}</span>
              <span>{expandedSteps.includes(idx) ? "−" : "+"}</span>
            </button>
            {expandedSteps.includes(idx) && (
              <div className="px-4 py-3 bg-white text-gray-800">{content}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// =================== Main Component ===================
const MotifMutation: React.FC = () => {
  const [sequence, setSequence] = useState<string>("");
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [n, setN] = useState<number>(100);
  const [nMut, setNMut] = useState<number>(1);
  const [mode, setMode] = useState<string>("normal");
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);

  const analyze = async (): Promise<void> => {
    if (!sequence.trim()) {
      setError("Please enter a glycan sequence before analyzing.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await axios.post<MotifResponse>(`${BASE_URL}/api/motif/mutate`, {
        sequence,
        n_mut: nMut,
        n,
        mode,
      });

      const freq = res.data.motif_frequencies;
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

      const color =
        mode === "normal"
          ? "rgba(34,197,94,0.6)"
          : mode === "moderate"
          ? "rgba(234,179,8,0.6)"
          : "rgba(239,68,68,0.6)";

      setChartData({
        labels: sorted.map(([k]) => k),
        datasets: [
          {
            label: "Motif Frequency",
            data: sorted.map(([, v]) => v),
            backgroundColor: color,
          },
        ],
      });
    } catch (err: any) {
      console.error("Axios error:", err.message);
      if (err.response) setError("Backend responded with an error.");
      else if (err.request) setError("No response from backend.");
      else setError("Unexpected error: " + err.message);
    }
    setLoading(false);
  };

  const toggleStep = (idx: number): void => {
    if (expandedSteps.includes(idx)) {
      setExpandedSteps(expandedSteps.filter((i) => i !== idx));
    } else {
      setExpandedSteps([...expandedSteps, idx]);
    }
  };

  const handleSequenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setSequence(e.target.value);
  };

  const handleNMutChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setNMut(Number(e.target.value));
  };

  const handleNChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setN(Number(e.target.value));
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setMode(e.target.value);
  };

  const handleReset = (): void => {
    setSequence("");
    setN(100);
    setNMut(1);
    setMode("normal");
    setChartData(null);
  };

  const handleExampleClick = (): void => {
    setSequence("GlcNAc(b1-4)Gal(b1-3)GlcNAc(b1-6)Gal(b1-4)Glc");
  };

  return (
    <div className="mt-16 mb-20 w-full max-w-6xl mx-auto">
      <div className="bg-white/80 backdrop-blur-md border border-blue-300 rounded-2xl p-8 shadow-2xl hover:shadow-blue-400 transition-shadow duration-300">
        <h2 className="text-2xl font-bold text-blue-800 mb-4 text-center flex items-center justify-center gap-3">
          <FaMicroscope className="text-blue-500" /> Glycan mutation simulation
          and motif enrichment
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Explore how glycan motifs shift under various mutation strategies.
        </p>

        <label className="block mb-2 font-semibold text-gray-700">
          🧪 Glycan Sequence
        </label>
        <textarea
          value={sequence}
          onChange={handleSequenceChange}
          className="w-full p-3 border border-gray-300 rounded mb-2"
          rows={4}
          placeholder="Enter glycan sequence, e.g., GlcNAc(b1-4)Gal(b1-3)..."
        />
        <p className="text-sm text-gray-500 mb-4">
          Input a linear glycan chain using IUPAC-style representation.
        </p>

        {error && (
          <div className="text-red-600 text-sm mb-4 font-semibold">{error}</div>
        )}

        <button
          onClick={handleExampleClick}
          className="flex items-center text-sm text-purple-600 hover:text-purple-800 transition mb-4"
        >
          <FaMagic className="mr-1" />
          Example
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block font-semibold text-gray-700">
              🔁 Mutation Depth
            </label>
            <input
              type="number"
              value={nMut}
              min={1}
              onChange={handleNMutChange}
              className="border p-2 rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Positions to mutate per glycan variant.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-gray-700">
              🧬 Mutant Samples
            </label>
            <input
              type="number"
              value={n}
              min={10}
              onChange={handleNChange}
              className="border p-2 rounded w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Total glycan mutants to generate.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-gray-700">
              🌪️ Mutation Intensity
            </label>
            <select
              value={mode}
              onChange={handleModeChange}
              className="border p-2 rounded w-full"
            >
              <option value="normal">Normal</option>
              <option value="moderate">Moderate</option>
              <option value="extreme">Extreme</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Normal</strong>: Conservative changes. <br />
              <strong>Moderate</strong>: Balanced randomization. <br />
              <strong>Extreme</strong>: Radical reshuffling.
            </p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={analyze}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition duration-200"
          >
            {loading ? "Analyzing..." : "🔍 Analyze Motifs"}
          </button>
          <button
            onClick={handleReset}
            className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300 transition duration-200"
          >
            Reset
          </button>
        </div>

        {chartData && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">
                📊 Motif Frequency Distribution
              </h2>
              <button
                onClick={() => setShowHelp(true)}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <FiHelpCircle size={22} className="mr-1" />
                Help
              </button>
            </div>

            <div className="h-[400px]">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => `Frequency: ${context.parsed.y}`,
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}
        {showHelp && (
          <HelpModal
            onClose={() => setShowHelp(false)}
            expandedSteps={expandedSteps}
            toggleStep={toggleStep}
          />
        )}
      </div>
    </div>
  );
};

export default MotifMutation;