import React, { useState } from "react";
import { FaMagic, FaDownload, FaSpinner } from "react-icons/fa";
import { BASE_URL } from "../../../utils/const";

interface ErrorResponse {
  error?: string;
}

const DatasetDownloader: React.FC = () => {
  const [species, setSpecies] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const example: string = "Homo_sapiens";

  const handleDownload = async (): Promise<void> => {
    if (!species.trim()) {
      setError("Please enter a species name.");
      return;
    }

    setLoading(true);
    setError(null);

    const query = encodeURIComponent(species.trim());
    const downloadUrl = `${BASE_URL}/api/download?species=${query}`;

    try {
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        const errData: ErrorResponse = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to download dataset.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${species.replace(/\s+/g, "_")}_data.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeciesChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSpecies(e.target.value);
  };

  const handleExampleClick = (): void => {
    setSpecies(example);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white py-12 px-6">
      <div className="bg-white/80 backdrop-blur-md border border-blue-300 rounded-2xl p-10 shadow-2xl w-full max-w-lg">
        <h2 className="text-3xl font-bold text-blue-800 mb-5 text-center flex items-center justify-center gap-3">
          <FaDownload className="text-blue-500 text-2xl" /> Glycan Dataset
          Downloader
        </h2>
        <p className="text-gray-600 text-center mb-6 text-lg">
          Access curated glycan datasets for computational or wet-lab research.
        </p>

        <input
          type="text"
          value={species}
          onChange={handleSpeciesChange}
          placeholder="Enter species (e.g., Homo sapiens)"
          className="w-full p-4 border border-gray-300 rounded-md mb-5 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="flex justify-center mb-5">
          <button
            onClick={handleExampleClick}
            className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-5 py-2.5 rounded-full hover:bg-indigo-200 transition text-base"
          >
            <FaMagic /> Try Homo sapiens
          </button>
        </div>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3.5 rounded-md text-lg font-medium hover:bg-blue-700 transition flex justify-center items-center"
        >
          {loading ? (
            <FaSpinner className="animate-spin mr-2" />
          ) : (
            "Download CSV"
          )}
        </button>

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
};

export default DatasetDownloader;