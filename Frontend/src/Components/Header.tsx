import React, { useState } from "react";
import Logo from "./Logo";
import NavBar from "./NavBar";
import { FaBars, FaTimes } from "react-icons/fa";

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "ghost" | "danger";
  size?: "default" | "icon";
}

const Button: React.FC<ButtonProps> = ({ onClick, children, className, variant, size }) => {
  const baseStyle =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "hover:bg-gray-200 text-gray-800",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };
  const sizes = { default: "h-10 py-2 px-4", icon: "h-10 w-10" };
  const buttonClass = `${baseStyle} ${sizes[size || "default"]} ${
    variants[variant || "default"]
  } ${className || ""}`;
  return (
    <button onClick={onClick} className={buttonClass}>
      {children}
    </button>
  );
};

const Header: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const handleLinkClick = () => setIsSidebarOpen(false);

  return (
    <>
      <header className="w-full sticky top-0 z-40 bg-gradient-to-r from-white via-blue-50 to-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo />
          </div>

          {/* Desktop Navbar */}
          <div className="hidden md:flex justify-center">
            <NavBar
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar}
              handleLinkClick={handleLinkClick}
            />
          </div>

          {/* Mobile Toggle Button */}
          <div className="flex items-center justify-end flex-shrink-0 space-x-4">
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                {isSidebarOpen ? (
                  <FaTimes className="w-6 h-6" />
                ) : (
                  <FaBars className="w-6 h-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <div className="md:hidden fixed top-20 left-0 w-full bg-white shadow-md z-50 p-4">
          <NavBar
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            handleLinkClick={handleLinkClick}
          />
        </div>
      )}
    </>
  );
};

export default Header;