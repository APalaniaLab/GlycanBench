import React from "react";
import { FaCog, FaDownload, FaMagic, FaSyncAlt } from "react-icons/fa";

// TypeScript interfaces
interface ActionControlsProps {
  isLoading: boolean;
  onGenerateNetwork: () => void;
  onResetLayout: (fit?: boolean) => void;
  onExportPNG: () => void;
  canPerformActions: boolean;
}

const ActionControls: React.FC<ActionControlsProps> = ({
  isLoading,
  onGenerateNetwork,
  onResetLayout,
  onExportPNG,
  canPerformActions,
}) => (
  <div className="flex flex-col space-y-3">
    <button
      onClick={onGenerateNetwork}
      disabled={isLoading}
      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md disabled:opacity-60 flex items-center justify-center text-base font-medium transition-colors"
    >
      {isLoading ? (
        <FaSyncAlt className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
      ) : (
        <FaMagic className="h-5 w-5 mr-2" />
      )}
      {isLoading ? "Generating..." : "Generate Network"}
    </button>
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onResetLayout(true)}
        className={`bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md flex items-center justify-center text-sm transition-colors ${
          !canPerformActions ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={!canPerformActions}
      >
        <FaCog className="h-4 w-4 mr-1.5" /> Reset Layout
      </button>
      <button
        onClick={onExportPNG}
        className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center text-sm transition-colors ${
          !canPerformActions ? "opacity-50 cursor-not-allowed" : ""
        }`}
        disabled={!canPerformActions}
      >
        <FaDownload className="h-4 w-4 mr-1.5" /> Export PNG
      </button>
    </div>
  </div>
);

export default ActionControls;