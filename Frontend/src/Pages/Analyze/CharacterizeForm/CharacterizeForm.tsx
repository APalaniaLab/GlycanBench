import React, { useState } from "react";
import Select, { type SingleValue } from "react-select";
import { FaRegCircleQuestion } from "react-icons/fa6";
import { BASE_URL } from "../../../utils/const";

// ========== Types ==========
interface RankOption {
  value: string;
  label: string;
}

interface FormData {
  mono: string;
  rank: RankOption;
  focus: string;
  modifications: boolean;
  thresh: number;
}

const ranks: RankOption[] = [
  { value: "Kingdom", label: "Kingdom" },
  { value: "Phylum", label: "Phylum" },
  { value: "Class", label: "Class" },
  { value: "Order", label: "Order" },
  { value: "Family", label: "Family" },
  { value: "Genus", label: "Genus" },
  { value: "Species", label: "Species" },
  { value: "Variants", label: "Variants" },
  { value: "Neighbors", label: "Neighbors" },
];

const CharacterizeForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    mono: "D-Rha",
    rank: ranks[0],
    focus: "Bacteria",
    modifications: true,
    thresh: 10,
  });

  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const handleSelectChange = (selected: SingleValue<RankOption>, name: string) => {
    if (selected) {
      setFormData((prev) => ({ ...prev, [name]: selected }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setImage(null);
    setLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/characterize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sugar: formData.mono,
          rank: formData.rank.value,
          focus: formData.focus,
          modifications: formData.modifications,
          thresh: Number(formData.thresh),
        }),
      });

      const result = await response.json();
      if (result.image) {
        setImage(`data:image/png;base64,${result.image}`);
      } else {
        setError(result.error || "Unknown error occurred");
      }
    } catch {
      setError("Error: Failed to fetch from server");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-6 py-10 my-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-xl">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-700">
        Monosaccharide
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md"
        noValidate
      >
        <div className="space-y-4">
          {/* Monosaccharide */}
          <label className="block">
            <span className="text-gray-700 font-semibold mb-1 block">
              Monosaccharide
            </span>
            <input
              type="text"
              name="mono"
              value={formData.mono}
              onChange={handleChange}
              placeholder="e.g. D-Rha"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </label>

          {/* Rank */}
          <label className="block">
            <span className="text-gray-700 font-semibold mb-1 block">Rank</span>
            <Select
              options={ranks}
              value={formData.rank}
              onChange={(selected) => handleSelectChange(selected, "rank")}
              className="rounded"
            />
          </label>

          {/* Focus */}
          <label className="block">
            <span className="text-gray-700 font-semibold mb-1 block">
              Focus
            </span>
            <input
              type="text"
              name="focus"
              value={formData.focus}
              onChange={handleChange}
              placeholder="e.g. Bacteria"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </label>

          {/* Threshold + Tooltip */}
          <label className="block relative">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-gray-700 font-semibold">
                Threshold: {formData.thresh}
              </span>

              {/* Info icon */}
              <button
                type="button"
                onClick={() => setShowTooltip((prev) => !prev)}
                className="text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                <FaRegCircleQuestion className="w-5 h-5" />
              </button>

              {/* Tooltip box */}
              {showTooltip && (
                <div className="absolute top-8 left-0 bg-gray-800 text-white text-sm rounded px-3 py-1 shadow-lg whitespace-nowrap z-10">
                  Minimum count threshold for inclusion
                </div>
              )}
            </div>

            <input
              name="thresh"
              type="range"
              min="1"
              max="50"
              value={formData.thresh}
              onChange={handleChange}
              className="w-full"
            />
          </label>

          {/* Modifications toggle */}
          <div className="flex items-center space-x-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="modifications"
                checked={formData.modifications}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 transition-all"></div>
              <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-full"></div>
            </label>
            <span className="text-gray-700 font-semibold">
              Consider Modifications
            </span>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded text-white font-semibold ${
              loading
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-700 hover:bg-blue-800"
            } transition-colors`}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </form>

      {/* Error message */}
      {error && (
        <p className="mt-4 text-center text-red-600 font-semibold">{error}</p>
      )}

      {/* Image output */}
      {image && (
        <div className="mt-6">
          <img
            src={image}
            alt="Result"
            className="mx-auto rounded shadow-lg max-w-full"
          />
        </div>
      )}
    </div>
  );
};

export default CharacterizeForm;
