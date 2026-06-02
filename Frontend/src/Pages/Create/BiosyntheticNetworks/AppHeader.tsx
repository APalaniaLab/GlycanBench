import React from "react";
import { IoSparklesSharp } from "react-icons/io5";
import CustomToggleSwitch from "./CustomToggleSwitch";

// TypeScript interfaces
interface AppHeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: (checked: boolean) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ isDarkMode, onToggleDarkMode }) => (
  <header
    className={`mb-6 pb-4 border-b ${
      isDarkMode ? "border-gray-700" : "border-gray-300"
    }`}
  >
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <IoSparklesSharp className="h-10 w-10 text-indigo-500" />
        <div>
          <h1
            className={`text-3xl font-bold ${
              isDarkMode ? "text-indigo-400" : "text-indigo-700"
            }`}
          >
            Biosynthetic Networks
          </h1>
          <p
            className={`text-sm ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            } mt-1`}
          >
            Visualize Glycan Biosynthetic Networks Interactively
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-sm">{isDarkMode ? "Dark" : "Light"} Mode</span>
        <CustomToggleSwitch
          checked={isDarkMode}
          onChange={onToggleDarkMode}
          srOnlyLabel="Toggle Dark Mode"
        />
      </div>
    </div>
  </header>
);

export default AppHeader;