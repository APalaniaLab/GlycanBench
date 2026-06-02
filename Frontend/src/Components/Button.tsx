import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = "", 
  onClick, 
  type = "button" 
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`transition duration-300 ease-in-out transform hover:scale-105 font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;