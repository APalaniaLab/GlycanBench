import React from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { FaExclamationTriangle, FaTimesCircle, FaSearch } from "react-icons/fa";

// TypeScript interfaces
interface NetworkElement {
  data: {
    id: string;
    is_root?: boolean;
    is_input?: boolean;
    special_type?: string;
    image?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface CytoscapeInstance {
  nodes: (selector?: string) => any;
  elements: () => any;
  layout: (options: any) => any;
  animate: (options: any, animationOptions?: any) => any;
  scratch: (key: string, value?: any) => any;
  destroyed: () => boolean;
  removeListener: (event: string, ...args: any[]) => void;
  on: (event: string, ...args: any[]) => void;
  png: (options: any) => string;
}

interface GraphVisualizationProps {
  searchTerm: string;
  onSearchTermChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error: string;
  warning: string;
  networkGenerated: boolean;
  elements: NetworkElement[];
  cytoscapeStylesheet: any[];
  onCyRef: (cyInstance: CytoscapeInstance) => void;
  isDarkMode: boolean;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  searchTerm,
  onSearchTermChange,
  error,
  warning,
  networkGenerated,
  elements,
  cytoscapeStylesheet,
  onCyRef,
  isDarkMode,
}) => (
  <main className="lg:col-span-8">
    <div
      className={`border rounded-lg shadow-xl p-1 ${
        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-300"
      }`}
    >
      <div className="flex justify-between items-center p-2 mb-2">
        <div className="relative w-full max-w-xs">
          <input
            id="nodeSearch"
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={onSearchTermChange}
            className={`border rounded-md px-3 py-1.5 text-sm w-full pl-8 ${
              isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-200"
                : "border-gray-300 bg-white"
            } focus:ring-indigo-500 focus:border-indigo-500`}
          />
          <FaSearch
            className={`absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          />
        </div>
      </div>
      {error && (
        <div
          className={`m-4 p-3 rounded-md text-sm ${
            isDarkMode ? "bg-red-800 text-red-100" : "bg-red-100 text-red-700"
          } flex items-center`}
        >
          <FaTimesCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      {warning && (
        <div
          className={`m-4 p-3 rounded-md text-sm ${
            isDarkMode
              ? "bg-yellow-700 text-yellow-100"
              : "bg-yellow-100 text-yellow-700"
          } flex items-center`}
        >
          <FaExclamationTriangle className="h-5 w-5 mr-2" />
          {warning}
        </div>
      )}

      <div
        className={`w-full h-[calc(100vh-12rem)] min-h-[500px] md:min-h-[600px] rounded-md overflow-hidden ${
          isDarkMode ? "bg-gray-800" : "bg-gray-50"
        }`}
      >
        {networkGenerated && elements.length > 0 ? (
          <CytoscapeComponent
            cy={onCyRef}
            elements={CytoscapeComponent.normalizeElements(elements)}
            style={{ width: "100%", height: "100%" }}
            stylesheet={cytoscapeStylesheet}
            layout={{ name: "preset" }} // 'preset' means use node positions if defined, or default if not. Layout is applied via handleResetLayout.
            textureOnViewport={true}
            pixelRatio="auto"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
            <svg
              className={`w-24 h-24 ${
                isDarkMode ? "text-gray-600" : "text-gray-400"
              } mb-4`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.037-.502.068-.75.097m0 0A18.652 18.652 0 002.25 6.75C1.266 6.75.75 7.41.75 8.25v3.75c0 .84.516 1.5 1.5 1.5H6c.074 0 .147-.002.22-.006M14.25 3.104v5.714c0 .885-.506 1.664-1.273 2.042L9.75 14.5M14.25 3.104c.251.037.502.068.75.097m0 0A18.652 18.652 0 0121.75 6.75c.984 0 1.5.66 1.5 1.5v3.75c0 .84-.516 1.5-1.5 1.5H18a2.246 2.246 0 00-.22.006M4.5 18.75c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V15.188c0-.885-.506-1.664-1.273-2.042L14.25 11.25M4.5 18.75L9.75 11.25M14.25 11.25L19.5 18.75m0 0H4.5"
              ></path>
            </svg>
            <h3
              className={`text-xl font-semibold ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Network Awaits Your Glycans!
            </h3>
            <p
              className={`${
                isDarkMode ? "text-gray-500" : "text-gray-400"
              } mt-2 text-sm`}
            >
              Enter glycan structures in the panel on the left, or choose an
              example, then click "Generate Network".
            </p>
          </div>
        )}
      </div>
    </div>
  </main>
);

export default GraphVisualization;