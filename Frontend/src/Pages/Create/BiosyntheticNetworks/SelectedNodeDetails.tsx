import React from "react";
import { FaInfoCircle } from "react-icons/fa";

// TypeScript interfaces
interface SelectedNodeInfo {
  id: string;
  data?: {
    is_input?: boolean;
    is_root?: boolean;
    [key: string]: any;
  };
}

interface SelectedNodeDetailsProps {
  selectedNodeInfo: SelectedNodeInfo | null;
  isDarkMode: boolean;
}

const SelectedNodeDetails: React.FC<SelectedNodeDetailsProps> = ({ 
  selectedNodeInfo, 
  isDarkMode 
}) => {
  if (!selectedNodeInfo) return null;
  
  return (
    <div
      className={`p-4 rounded-lg shadow-lg ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } mt-4 animate-fadeIn`}
    >
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <FaInfoCircle className="h-5 w-5 mr-2 text-blue-400" /> Selected Glycan
      </h3>
      <p
        className={`text-xs break-all ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}
      >
        {selectedNodeInfo.id}
      </p>
      {selectedNodeInfo.data?.is_input && (
        <span className="mt-1 text-xs inline-block bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
          Input Glycan
        </span>
      )}
      {selectedNodeInfo.data?.is_root && (
        <span className="mt-1 ml-1 text-xs inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
          Root Node
        </span>
      )}
    </div>
  );
};

export default SelectedNodeDetails;