import React from "react";
import { Link } from "react-router";
import { FiChevronUp } from "react-icons/fi";
import {
  FaTools,
  FaMicroscope,
  FaAlignLeft,
  FaBrain,
} from "react-icons/fa";
import { FaCodeCompare } from "react-icons/fa6";
import { RiChatAiLine } from "react-icons/ri";
import { GrCluster } from "react-icons/gr";
import { MdViewInAr } from "react-icons/md";

interface NavItem {
  to: string;
  label: string;
}

interface SidebarSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

// Footer navigation sections
const sidebarNavConfig: SidebarSection[] = [
  {
    title: "Create",
    icon: FaTools,
    items: [
      { to: "/GlycanMolecule", label: "Glycan Molecule" },
      { to: "/BiosyntheticNetworks", label: "Biosynthetic Networks" },
      { to: "/GlycanFormatConverter", label: "Interconvert between formats" },
    ],
  },
  {
    title: "Visualize",
    icon: MdViewInAr,
    items: [
      { to: "/GlycanDrawer", label: "2D Draw" },
      { to: "/visualize", label: "3D Representation" },
      { to: "/pathwayMaps", label: "KEGG Pathway View" },
    ],
  },
  {
    title: "Analyse",
    icon: FaMicroscope,
    items: [
      { to: "/characterize", label: "Monosaccharide" },
      { to: "/GlycanInsight", label: "Glycan" },
      { to: "/DescriptorCalculator", label: "Molecule Descriptors" },
      { to: "/MotifMutation", label: "Motif Mutation" },
    ],
  },
    {
    title: "Compare",
    icon: FaCodeCompare,
    items: [     {
        to: "/CompareGlycans",
        label: "Two glycans",
      }],
  },
      {
    title: "Align",
    icon: FaAlignLeft,
    items: [ { to: "/sequenceAlignment", label: "Glycan Sequences" }],
  },
   {
    title: "Cluster",
    icon: GrCluster,
    items: [   
      { to: "/cluster/multiple", label: "Cluster Three or more glycans" },
      { to: "/cluster/optimize", label: "Optimize the number of clusters" },
      { to: "/cluster/outliers", label: "Detect Outlier Glycans" }
     ],
  },
  {
    title: "Predict",
    icon: FaBrain,
    items: [{ to: "/prediction", label: "Immunogenicity" }
    ],
  },


   {
    title: "Chat",
    icon: RiChatAiLine,
    items: [
            {
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

const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const siteLinks = navItems.filter((item) => item.to && item.to !== "/");

  return (
    <footer className="bg-gradient-to-br from-blue-400 via-blue-300 to-blue-200 text-gray-800 py-10 drop-shadow-lg">
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-10">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          {/* Branding */}
          <div className="space-y-4 flex-shrink-0">
            <Link
              to="/"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-3xl font-bold text-blue-700 tracking-wide">
                Glycan<span className="text-blue-900">Bench</span>
              </span>
            </Link>
            <p className="text-sm text-gray-600 max-w-xs">
              An integrated platform for conception, visualization, analysis, alignment, clustering, property prediction, and literature exploration in Glycobiology.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-6 text-sm text-gray-700 w-full">
            {sidebarNavConfig.map(({ title, icon: Icon, items }) => (
              <div key={title}>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                  <Icon className="text-blue-500" />
                  <span>{title}</span>
                </h4>
                <ul className="space-y-1">
                  {items.map(({ to, label }) => (
                    <li key={label}>
                      <Link
                        to={to}
                        className="inline-block px-2 py-1 rounded-md transition-colors duration-200 hover:bg-blue-400 hover:text-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Static Links */}
            <div>
              <h4 className="font-semibold mb-3 text-gray-900">GlycanBench</h4>
              <ul className="space-y-1">
                {siteLinks.map(({ to, label }) => (
                  <li key={label}>
                    {to && (
                      <Link
                        to={to}
                        className="inline-block px-2 py-1 rounded-md transition-colors duration-200 hover:bg-blue-400 hover:text-white"
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Scroll to Top */}
        <div className="text-center mt-4">
          <button
            onClick={scrollToTop}
            aria-label="Scroll to Top"
            className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-md transition-transform transform hover:scale-110"
          >
            <FiChevronUp size={24} />
          </button>
        </div>

        {/* Copyright */}
        <div className="mt-4 text-center border-t border-blue-300 pt-6 space-y-1">
          <p className="text-sm text-gray-700">
            Vigneshwaran CJ &amp; Ashok Palaniappan.{" "}
            <em>GlycanBench: a unified resource for working with glycans</em>, 2026 [submitted]
          </p>
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} GlycanBench. All rights reserved. Only for academic non-commercial use.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;