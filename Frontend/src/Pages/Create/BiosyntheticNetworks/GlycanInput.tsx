import React from "react";
import { FaLightbulb } from "react-icons/fa";

// ========== Types ==========
interface ExampleGlycanSet {
  name: string;
  glycans: string;
}

interface GlycanInputProps {
  glycansInput: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  exampleGlycanSets: ExampleGlycanSet[];
  activeExample: number | null;
  onExampleClick: (example: ExampleGlycanSet, index: number) => void;
  isDarkMode: boolean;
}

const GlycanInput: React.FC<GlycanInputProps> = ({
  glycansInput,
  onInputChange,
  exampleGlycanSets,
  activeExample,
  onExampleClick,
  isDarkMode,
}) => (
  <div
    className={`p-4 rounded-lg shadow-lg ${
      isDarkMode ? "bg-gray-800" : "bg-white"
    }`}
  >
    <h2 className="text-xl font-semibold mb-3 flex items-center">
      <FaLightbulb className="h-5 w-5 mr-2 text-yellow-500" /> Input Glycans
    </h2>
    <textarea
      rows={5}
      className={`w-full border rounded p-2 text-sm ${
        isDarkMode
          ? "bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
          : "border-gray-300 placeholder-gray-400"
      }`}
      value={glycansInput}
      onChange={onInputChange}
      placeholder="Enter IUPAC-condensed glycans, one per line..."
    />
    <div className="mt-3">
      <p
        className={`text-xs ${
          isDarkMode ? "text-gray-400" : "text-gray-500"
        } mb-1`}
      >
        Quick Start Examples:
      </p>
      <div className="flex flex-wrap gap-2">
        {exampleGlycanSets.map((example, i) => (
          <button
            key={i}
            onClick={() => onExampleClick(example, i)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeExample === i
                ? "bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-1 ring-offset-transparent"
                : isDarkMode
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {example.name}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default GlycanInput;
