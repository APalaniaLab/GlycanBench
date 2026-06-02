import React from "react";

// ========== Types ==========
interface CustomToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  srOnlyLabel?: string;
}

const CustomToggleSwitch: React.FC<CustomToggleSwitchProps> = ({ checked, onChange, srOnlyLabel = "Toggle" }) => {
  const handleToggle = () => {
    onChange(!checked);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleToggle}
      className={`${
        checked ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
      } relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800`}
    >
      <span className="sr-only">{srOnlyLabel}</span>
      <span
        className={`${
          checked ? "translate-x-6" : "translate-x-1"
        } inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out`}
      />
    </button>
  );
};

export default CustomToggleSwitch;
