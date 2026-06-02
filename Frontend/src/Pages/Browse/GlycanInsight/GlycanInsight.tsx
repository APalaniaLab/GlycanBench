import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import {
  FaDna,
  FaLeaf,
  FaVial,
  FaDisease,
  FaExclamationCircle,
  FaMagic,
} from "react-icons/fa";
import { BASE_URL } from "../../../utils/const";

ChartJS.register(ArcElement, Tooltip, Legend);

// TypeScript interfaces
interface GlycanInsightData {
  glytoucan_id: string;
  species: string[];
  motifs: string[];
  glycan_class: string;
  phyla: string[];
  cell_lines: string[];
  diseases: [string, string, string][];
}

interface DashboardCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

interface SpeciesListProps {
  species: string[];
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderColor: string;
    borderWidth: number;
  }[];
}

interface ChartOptions {
  plugins: {
    legend: {
      position: "right";
      labels: {
        color: string;
      };
    };
  };
  maintainAspectRatio: boolean;
}

const GlycanLogo: React.FC = () => (
  <svg
    width="60"
    height="60"
    viewBox="0 0 100 100"
    className="inline-block mr-3 text-indigo-600"
  >
    <path
      d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
    />
    <path d="M50 50 L85 30" fill="none" stroke="currentColor" strokeWidth="5" />
    <path d="M50 50 L15 30" fill="none" stroke="currentColor" strokeWidth="5" />
    <path d="M50 50 L15 70" fill="none" stroke="currentColor" strokeWidth="5" />
    <circle cx="50" cy="10" r="7" fill="currentColor" />
    <circle cx="85" cy="70" r="7" fill="currentColor" />
  </svg>
);

const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon, children, className = "" }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
    className={`bg-white p-5 rounded-xl border border-slate-200 shadow-lg h-full ${className}`}
  >
    <h3 className="text-xl font-bold mb-4 text-indigo-600 flex items-center">
      {icon}
      <span className="ml-3">{title}</span>
    </h3>
    <div className="text-slate-700">{children}</div>
  </motion.div>
);

const SpeciesList: React.FC<SpeciesListProps> = ({ species }) => {
  const [showAll, setShowAll] = useState<boolean>(false);
  const displayedSpecies = showAll ? species : species.slice(0, 40);

  const toggleShowAll = (): void => {
    setShowAll(!showAll);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {displayedSpecies.map((sp, i) => (
          <span
            key={i}
            className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium"
          >
            {sp.replaceAll("_", " ")}
          </span>
        ))}
      </div>
      {species.length > 40 && (
        <button
          onClick={toggleShowAll}
          className="text-indigo-600 mt-3 text-sm hover:underline"
        >
          {showAll ? "Show Less" : `+ ${species.length - 40} more...`}
        </button>
      )}
    </>
  );
};

const GlycanInsight: React.FC = () => {
  const [userInput, setUserInput] = useState<string>("");
  const [data, setData] = useState<GlycanInsightData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const exampleSequence: string =
    "Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc";

  const handleLoadExample = (): void => {
    setUserInput(exampleSequence);
  };

  const fetchInsight = async (): Promise<void> => {
    if (!userInput.trim()) {
      setError("Please enter a glycan sequence or a GlyTouCan ID.");
      return;
    }
    setLoading(true);
    setData(null);
    setError(null);
    try {
      const res = await axios.post<GlycanInsightData>(`${BASE_URL}/api/glycan_insight`, {
        userInput,
      });
      setData(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.error || "An unknown server error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderDoughnutChart = (items: string[]): React.ReactElement => {
    const counts = items.reduce(
      (acc: Record<string, number>, item: string) => ({ ...acc, [item]: (acc[item] || 0) + 1 }),
      {}
    );
    const chartData: ChartData = {
      labels: Object.keys(counts),
      datasets: [
        {
          data: Object.values(counts),
          backgroundColor: [
            "#4f46e5",
            "#0ea5e9",
            "#10b981",
            "#f59e0b",
            "#8b5cf6",
            "#ec4899",
            "#64748b",
          ],
          borderColor: "#ffffff",
          borderWidth: 3,
        },
      ],
    };
    const options: ChartOptions = {
      plugins: { legend: { position: "right", labels: { color: "#475569" } } },
      maintainAspectRatio: false,
    };
    return (
      <div className="h-64">
        <Doughnut data={chartData} options={options} />
      </div>
    );
  };

  const hasMeaningfulResults: boolean =
    data !== null &&
    (data.glytoucan_id !== "Not Found" ||
      data.species.length > 0 ||
      data.motifs.length > 0);

  const handleUserInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setUserInput(e.target.value);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-2 flex items-center justify-center text-slate-900">
            <GlycanLogo /> Glycan
          </h1>
        </header>

        <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg border border-slate-200 shadow-xl">
          <div className="relative w-full">
            <textarea
              className="w-full p-3 pr-12 text-slate-900 bg-white rounded-md border-2 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 transition duration-300 font-mono"
              rows={3}
              placeholder="Enter a Glycan Sequence or GlyTouCan ID..."
              value={userInput}
              onChange={handleUserInputChange}
            />
            <button
              onClick={handleLoadExample}
              className="absolute top-3 right-3 text-slate-400 hover:text-indigo-500 transition-colors duration-200"
              title="Load Example Sequence"
            >
              <FaMagic className="h-5 w-5" />
            </button>
          </div>
          <button
            className="w-full mt-4 bg-indigo-600 px-6 py-3 rounded-md font-bold text-white hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed"
            onClick={fetchInsight}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Explore Insights"}
          </button>
        </div>

        <div className="mt-10 min-h-[200px]">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div
                  role="status"
                  className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"
                />
              </motion.div>
            )}

            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto p-4 bg-rose-50 border border-rose-300 rounded-lg text-center text-rose-800"
              >
                <strong>Error:</strong> {error}
              </motion.div>
            )}

            {data &&
              !loading &&
              !error &&
              (!hasMeaningfulResults ? (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-2xl mx-auto p-4 bg-amber-50 border border-amber-300 rounded-lg text-center text-amber-800 flex items-center justify-center"
                >
                  <FaExclamationCircle className="mr-3 text-2xl" />
                  <div>
                    <h3 className="font-bold">Analysis Complete</h3>
                    <p>No biological information was found in the database.</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  className="grid gap-6 grid-cols-1 lg:grid-cols-5"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.07 } },
                  }}
                >
                  <DashboardCard
                    title="Glycan Information"
                    icon={<FaDna />}
                    className="lg:col-span-5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="mb-1 font-semibold text-slate-500">
                          GlyTouCan ID
                        </p>
                        <p className="font-mono text-amber-600 text-lg font-semibold">
                          {data.glytoucan_id}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 font-semibold text-slate-500">
                          Contained Motifs
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {data.motifs.length > 0 ? (
                            data.motifs.map((m, i) => (
                              <span
                                key={i}
                                className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full text-xs font-mono"
                              >
                                {m}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500">None found</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </DashboardCard>

                  <DashboardCard
                    title="Glycan Class"
                    icon={<FaLeaf />}
                    className="lg:col-span-5"
                  >
                    <p className="text-lg text-indigo-800 font-mono">
                      {data.glycan_class || "Unknown"}
                    </p>
                  </DashboardCard>

                  <DashboardCard
                    title="Phyla Distribution"
                    icon={<FaDna />}
                    className="lg:col-span-2"
                  >
                    {data.phyla.length > 0 ? (
                      renderDoughnutChart(data.phyla)
                    ) : (
                      <p className="text-slate-500 h-full flex items-center justify-center">
                        No phyla data to display.
                      </p>
                    )}
                  </DashboardCard>

                  <DashboardCard
                    title="Species Distribution"
                    icon={<FaLeaf />}
                    className="lg:col-span-3"
                  >
                    <h4 className="font-semibold text-slate-800 mb-2">
                      Expressed In Species
                    </h4>
                    {data.species.length > 0 ? (
                      <SpeciesList species={data.species} />
                    ) : (
                      <p className="text-slate-500">
                        No species information found.
                      </p>
                    )}
                  </DashboardCard>

                  <DashboardCard
                    title="Expressed in Cell Lines & Tissues"
                    icon={<FaVial />}
                    className="lg:col-span-2"
                  >
                    <div className="max-h-60 overflow-y-auto pr-2 text-sm">
                      {data.cell_lines.length > 0 ? (
                        <ul className="list-disc list-inside columns-1 sm:columns-2 gap-2">
                          {data.cell_lines.map((cl, i) => (
                            <li key={i} className="mb-1">
                              {cl}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-500">
                          No cell line or tissue data found.
                        </p>
                      )}
                    </div>
                  </DashboardCard>

                  <DashboardCard
                    title="Disease Associations"
                    icon={<FaDisease />}
                    className="lg:col-span-3"
                  >
                    <div className="max-h-60 overflow-y-auto pr-2">
                      <table className="w-full text-sm text-left">
                        <thead className="text-slate-500 uppercase bg-slate-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-2">Disease</th>
                            <th className="px-4 py-2">Regulation</th>
                            <th className="px-4 py-2">Sample</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {data.diseases.length > 0 ? (
                            data.diseases.map(([d, dir, s], i) => (
                              <tr
                                key={i}
                                className="border-b border-slate-200 hover:bg-slate-50"
                              >
                                <td className="px-4 py-2">{d}</td>
                                <td
                                  className={`px-4 py-2 font-bold ${
                                    dir === "up"
                                      ? "text-emerald-600"
                                      : "text-rose-600"
                                  }`}
                                >
                                  {dir}
                                </td>
                                <td className="px-4 py-2">{s}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={3}
                                className="text-center p-4 text-slate-500"
                              >
                                No disease associations found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </DashboardCard>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default GlycanInsight;