import React from "react";
import { FaAngleDown, FaAngleUp } from "react-icons/fa";
import { IoSettingsSharp } from "react-icons/io5";

// TypeScript interfaces
interface NetworkSettingsProps {
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  permittedRootsInput: string;
  onPermittedRootsInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedEdgeType: string;
  onEdgeTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  availableEdgeTypes: string[];
  selectedPTMs: string[];
  onTogglePTM: (ptm: string) => void;
  availablePTMs: string[];
  isDarkMode: boolean;
}

const NetworkSettings: React.FC<NetworkSettingsProps> = ({
  showAdvanced,
  onToggleAdvanced,
  permittedRootsInput,
  onPermittedRootsInputChange,
  selectedEdgeType,
  onEdgeTypeChange,
  availableEdgeTypes,
  selectedPTMs,
  onTogglePTM,
  availablePTMs,
  isDarkMode,
}) => (
  <div
    className={`p-4 rounded-lg shadow-lg ${
      isDarkMode ? "bg-gray-800" : "bg-white"
    }`}
  >
    <button
      className="w-full text-left text-xl font-semibold mb-3 flex items-center focus:outline-none"
      onClick={onToggleAdvanced}
      aria-expanded={showAdvanced}
      aria-controls="advanced-network-params"
    >
      <IoSettingsSharp className="h-6 w-6 mr-2 text-blue-500" />
      Network Parameters
      {showAdvanced ? (
        <FaAngleUp className="h-4 w-4 ml-auto" />
      ) : (
        <FaAngleDown className="h-4 w-4 ml-auto" />
      )}
    </button>
    {showAdvanced && (
      <div id="advanced-network-params" className="space-y-4 pt-2">
        <div>
          <label
            htmlFor="permittedRoots"
            className="block text-sm font-medium mb-1"
          >
            Permitted Roots (comma-separated):
          </label>
          <input
            id="permittedRoots"
            type="text"
            value={permittedRootsInput}
            onChange={onPermittedRootsInputChange}
            className={`w-full border rounded p-2 text-sm ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-200"
                : "border-gray-300 bg-white"
            } focus:ring-indigo-500 focus:border-indigo-500`}
            placeholder="e.g., Gal(b1-4)GlcNAc-ol, Gal(b1-4)Glc-ol"
          />
        </div>
        <div>
          <label htmlFor="edgeType" className="block text-sm font-medium mb-1">
            Edge Type:
          </label>
          <select
            id="edgeType"
            value={selectedEdgeType}
            onChange={onEdgeTypeChange}
            className={`w-full border rounded p-2 text-sm ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-200"
                : "border-gray-300 bg-white"
            } focus:ring-indigo-500 focus:border-indigo-500`}
          >
            {availableEdgeTypes.map((edgeType, idx) => (
              <option key={idx} value={edgeType}>
                {edgeType}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Allowed PTMs ({selectedPTMs.length} selected):
          </label>
          <div
            className={`max-h-40 overflow-y-auto border rounded p-2 space-y-1 text-xs ${
              isDarkMode ? "border-gray-600" : "border-gray-300"
            }`}
          >
            {availablePTMs.length > 0 ? (
              availablePTMs.map((ptm) => (
                <label
                  key={ptm}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-opacity-20 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedPTMs.includes(ptm)}
                    onChange={() => onTogglePTM(ptm)}
                    className="form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span>{ptm}</span>
                </label>
              ))
            ) : (
              <p className="text-xs text-gray-500">Loading PTMs...</p>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);

export default NetworkSettings;