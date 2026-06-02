import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary";
  size?: "small" | "medium" | "large";
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  className = "",
  variant = "primary",
  size = "medium",
}) => {
  const baseStyles = "px-4 py-2 rounded focus:outline-none";
  const variantStyles =
    variant === "primary" ? "bg-blue-600 text-white" : "bg-gray-200 text-black";
  const sizeStyles =
    size === "large" ? "text-lg" : size === "small" ? "text-sm" : "text-base";

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;