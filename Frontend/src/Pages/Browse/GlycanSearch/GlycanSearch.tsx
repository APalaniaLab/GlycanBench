import React, { useState } from "react";
import { FaMagic, FaSearch } from "react-icons/fa";

const GlycanSearch: React.FC = () => {
  const [pdbId, setPdbId] = useState<string>("");
  const example: string = "1GNY";

  const handleRedirect = (): void => {
    const trimmedId = pdbId.trim().toUpperCase();
    if (trimmedId) {
      window.open(`https://www.rcsb.org/structure/${trimmedId}`, "_blank");
    }
  };

  const handlePdbIdChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPdbId(e.target.value);
  };

  const handleExampleClick = (): void => {
    setPdbId(example);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white py-12 px-6">
      <div className="bg-white/80 backdrop-blur-md border border-blue-300 rounded-2xl p-10 shadow-2xl transition-transform duration-300 w-full max-w-lg">
        <h2 className="text-3xl font-bold text-blue-800 mb-5 text-center flex items-center justify-center gap-3">
          <FaSearch className="text-blue-500 text-2xl" /> PDB Search
        </h2>
        <p className="text-gray-600 text-center mb-6 text-lg">
          Enter a PDB ID and quickly navigate to glycan-related ligand pages.
        </p>

        <input
          type="text"
          value={pdbId}
          onChange={handlePdbIdChange}
          placeholder="Enter PDB ID (e.g., 1GNY)"
          className="w-full p-4 border border-gray-300 rounded-md mb-5 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <div className="flex justify-center mb-5">
          <button
            onClick={handleExampleClick}
            className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-5 py-2.5 rounded-full hover:bg-indigo-200 transition text-base"
          >
            <FaMagic />
            Try 1GNY
          </button>
        </div>

        <button
          onClick={handleRedirect}
          className="w-full bg-green-600 text-white py-3.5 rounded-md text-lg font-medium hover:bg-green-700 transition"
        >
          View on RCSB
        </button>
      </div>
    </div>
  );
};

export default GlycanSearch;