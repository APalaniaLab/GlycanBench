import React from "react";

// TypeScript interfaces
interface NetworkMetadata {
  num_nodes?: number;
  num_edges?: number;
  params_used?: {
    allowed_ptms: string[];
    permitted_roots: string[];
    edge_type: string;
  };
  [key: string]: any;
}

interface NetworkStatisticsProps {
  networkMetadata: NetworkMetadata | null;
  isDarkMode: boolean;
}

const NetworkStatistics: React.FC<NetworkStatisticsProps> = ({ 
  networkMetadata, 
  isDarkMode 
}) => {
  if (!networkMetadata) return null;
  
  return (
    <div
      className={`p-4 rounded-lg shadow-lg ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } mt-4`}
    >
      <h3 className="text-lg font-semibold mb-2">Network Stats</h3>
      <p className="text-xs">
        Nodes: {networkMetadata.num_nodes}, Edges: {networkMetadata.num_edges}
      </p>
      <details className="text-xs mt-1">
        <summary className="cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-400 focus:outline-none">
          Parameters Used
        </summary>
        <ul className="list-disc list-inside pl-4 pt-1 space-y-0.5">
          <li>
            <span className="font-medium">PTMs:</span>{" "}
            {networkMetadata.params_used?.allowed_ptms?.join(", ") || "None"}
          </li>
          <li>
            <span className="font-medium">Roots:</span>{" "}
            {networkMetadata.params_used?.permitted_roots?.join(", ") || "None"}
          </li>
          <li>
            <span className="font-medium">Edge Type:</span>{" "}
            {networkMetadata.params_used?.edge_type || "N/A"}
          </li>
        </ul>
      </details>
    </div>
  );
};

export default NetworkStatistics;