import React, { useState } from "react";
import {
  FaChevronDown,
  FaTimes,
  FaTools,
  FaMicroscope,
  FaAlignLeft,
  FaBrain,
} from "react-icons/fa";
import { FaCodeCompare } from "react-icons/fa6";
import { GrCluster } from "react-icons/gr";
import { RiChatAiLine } from "react-icons/ri";
import { MdViewInAr } from "react-icons/md";
import { NavLink } from "react-router";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  to: string;
  label: string;
}

interface SidebarSection {
  title: string;
  icon: React.ReactElement;
  items: NavItem[];
}

interface NavBarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  handleLinkClick: () => void;
}

const sidebarNavConfig: SidebarSection[] = [
  {
    title: "Create",
    icon: <FaTools className="text-blue-500" />,
    items: [
      { to: "/GlycanMolecule", label: "Glycan Molecule" },
      { to: "/BiosyntheticNetworks", label: "Biosynthetic Networks" },
      { to: "/GlycanFormatConverter", label: "Interconvert between formats" },
    ],
  },
  {
    title: "Visualize",
    icon: <MdViewInAr className="text-blue-500" />,
    items: [
      { to: "/GlycanDrawer", label: "2D Draw" },
      { to: "/visualize", label: "3D Representation" },
      { to: "/pathwayMaps", label: "KEGG Pathway View" },
    ],
  },

  {
    title: "Analyse",
    icon: <FaMicroscope className="text-green-500" />,
    items: [
      { to: "/characterize", label: "Monosaccharide" },
      { to: "/GlycanInsight", label: "Glycan" },
      { to: "/DescriptorCalculator", label: "Molecule Descriptors" },
      { to: "/MotifMutation", label: "Motif Mutation" },
    ],
  },
  {
    title: "Compare",
    icon: <FaCodeCompare className="text-purple-500" />,
    items: [      {
        to: "/CompareGlycans",
        label: "Two glycans",
      }],
  },
   {
    title: "Align",
    icon: <FaAlignLeft className="text-purple-500" />,
    items: [{ to: "/sequenceAlignment", label: "Glycan Sequences" }],
  },
  {
    title: "Cluster",
    icon: <GrCluster className="text-purple-500" />,
    items: [
      { to: "/cluster/multiple", label: "Cluster Three or more glycans" },
      { to: "/cluster/optimize", label: "Optimize the number of clusters" },
      { to: "/cluster/outliers", label: "Detect Outlier Glycans" }
    ],
  },
  {
    title: "Predict",
    icon: <FaBrain className="text-pink-500" />,
    items: [{
       to: "/prediction", label: "Immunogenicity" 
      },
    ],
  },
   {
    title: "Chat",
    icon: <RiChatAiLine className="text-pink-500" />,
    items: [ {
        to:"/GlycomicsChat", label:"Chat"
      }
    ],
  },
];

const navItems = [
  { to: "/", label: "Home" },
  { label: "Tools" },
  { to: "/aboutus", label: "About" },
  { to: "/help", label: "Help" },
];

const NavBar: React.FC<NavBarProps> = ({ isSidebarOpen, toggleSidebar, handleLinkClick }) => {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(
    sidebarNavConfig[0].title
  );
  const activeSection = sidebarNavConfig.find(
    (s) => s.title === activeCategory
  );

  return (
    <>
      <div className="flex items-center space-x-8">
        {navItems.map((item) => (
          <div
            key={item.label}
            className="relative"
            onMouseEnter={() =>
              item.label === "Tools" && setIsMegaMenuOpen(true)
            }
            onMouseLeave={() =>
              item.label === "Tools" && setIsMegaMenuOpen(false)
            }
          >
            {item.to ? (
              <NavLink
                to={item.to}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `text-lg font-bold px-3 py-2 transition duration-150 rounded-md ${
                    isActive
                      ? "text-blue-700 underline"
                      : "text-gray-800 hover:text-blue-600"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ) : (
              <button className="text-gray-800 font-bold text-lg flex items-center hover:text-blue-600 transition px-3 py-2">
                {item.label}
                <FaChevronDown
                  className={`ml-1 transition-transform duration-200 ${
                    isMegaMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
            {item.label === "Tools" && (
              <AnimatePresence>
                {isMegaMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute top-full mt-4 -translate-x-1/2 left-1/2 w-[44rem] bg-white/95 backdrop-blur-lg rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden"
                  >
                    <div className="flex">
                      <div className="w-1/3 border-r border-gray-200 bg-gray-50/50">
                        <ul className="p-3">
                          {sidebarNavConfig.map((section) => (
                            <li key={section.title}>
                              <button
                                onMouseEnter={() =>
                                  setActiveCategory(section.title)
                                }
                                className={`w-full text-left flex items-center p-3 rounded-md transition-colors duration-150 font-semibold text-base ${
                                  activeCategory === section.title
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                {React.cloneElement(section.icon as React.ReactElement<any>, {
                                  className: `${
                                    activeCategory === section.title
                                      ? "text-white"
                                      : (section.icon.props as any)?.className || ""
                                  } mr-3`,
                                })}
                                {section.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="w-2/3 p-5">
                        <h3 className="font-bold text-lg text-gray-800 mb-3">
                          {activeSection?.title}
                        </h3>
                        {activeSection &&
                          activeSection.items.map((menuItem) => (
                            <NavLink
                              key={menuItem.label}
                              to={menuItem.to}
                              onClick={() => {
                                handleLinkClick();
                                setIsMegaMenuOpen(false);
                              }}
                              className={({ isActive }) =>
                                `block px-4 py-2.5 rounded-lg transition duration-200 font-medium text-sm mb-1 ${
                                  isActive
                                    ? "bg-blue-100 text-blue-800"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                }`
                              }
                            >
                              {menuItem.label}
                            </NavLink>
                          ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        ))}
      </div>

      {/* MOBILE SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
              onClick={toggleSidebar}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 left-0 h-full bg-white/95 backdrop-blur-lg shadow-xl z-50 w-80 md:hidden"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-300">
                <h2 className="text-xl font-bold text-blue-600">Menu</h2>
                <button
                  onClick={toggleSidebar}
                  className="text-gray-600 hover:text-gray-900"
                  aria-label="Close menu"
                >
                  <FaTimes className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto h-[calc(100vh-65px)] flex flex-col">
                <div className="flex-grow">
                  {sidebarNavConfig.map((section) => (
                    <div key={section.title} className="mb-4">
                      <h3 className="text-md font-semibold text-gray-800 flex items-center mb-2 px-2">
                        {React.cloneElement(section.icon as React.ReactElement<any>, {
                          className: `${(section.icon.props as any)?.className || ""} mr-3`,
                        })}
                        {section.title}
                      </h3>
                      <ul className="space-y-1">
                        {section.items.map((item) => (
                          <li key={item.label}>
                            <NavLink
                              to={item.to}
                              onClick={handleLinkClick}
                              className={({ isActive }) =>
                                `block px-3 py-2 rounded-md font-medium ${
                                  isActive
                                    ? "bg-blue-100 text-blue-800"
                                    : "text-gray-700 hover:bg-gray-100"
                                }`
                              }
                            >
                              {item.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavBar;