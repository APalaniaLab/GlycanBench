import React, { useState, useCallback } from "react";
import { FaSearch, FaRobot } from "react-icons/fa";
import { motion } from "framer-motion";

const PubMedAI_Search: React.FC = () => {
  const [query, setQuery] = useState<string>("");

  const handleSearch = useCallback((): void => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    const encodedQuery = encodeURIComponent(trimmedQuery);
    window.open(
      `https://www.pubmed.ai/results?q=${encodedQuery}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") handleSearch();
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setQuery(e.target.value);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="bg-gradient-to-br from-white to-blue-50 p-8 rounded-3xl shadow-2xl max-w-xl mx-auto flex flex-col items-center relative"
      aria-label="PubMed AI Search"
    >
      <div
        className="absolute -top-10 bg-blue-600 p-4 rounded-full shadow-lg"
        aria-hidden="true"
      >
        <FaRobot className="text-white text-3xl" />
      </div>

      <h1 className="text-3xl font-extrabold text-center text-blue-700 mb-2 mt-6">
        Search with PubMed AI 🤖
      </h1>
      <p className="text-gray-600 text-center mb-6">
        Explore smart! Try:{" "}
        <span
          className="text-blue-500 italic"
          aria-label="example search query"
        >
          "Glycan AI for pathogen recognition"
        </span>
      </p>

      <div className="w-full relative">
        <input
          type="search"
          aria-label="Type your research question"
          placeholder="Type your research question..."
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          className="w-full px-5 py-3 pr-14 border border-blue-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition-all"
        />
        <button
          onClick={handleSearch}
          aria-label="Search"
          className="absolute top-1/2 right-3 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow transition-all"
        >
          <FaSearch />
        </button>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="mt-6 text-sm text-gray-500 text-center italic select-none"
      >
        Powered by{" "}
        <span className="text-blue-600 font-semibold">PubMed AI</span> & your
        curiosity ✨
      </motion.p>
    </motion.section>
  );
};

export default React.memo(PubMedAI_Search);