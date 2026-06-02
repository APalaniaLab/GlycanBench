import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FaFlask,
  FaCogs,
  FaAlignJustify,
  FaSearch,
  FaBook,
  FaShieldAlt,
  FaPlus,
  FaAtom,
  FaNetworkWired,
  FaVial,
  FaExchangeAlt,
  FaCube,
  FaPencilRuler,
  FaRoute,
  FaDna,
  FaChartBar,
  FaFileDownload,
  FaHistory,
  FaBrain,
  FaThList,
} from "react-icons/fa";
import { FaCodeCompare } from "react-icons/fa6";
import { SiChatbot } from "react-icons/si";
import { BsBoxes } from "react-icons/bs";
import { GrCluster } from "react-icons/gr";
import { RiChatAiLine } from "react-icons/ri";
import { MdViewInAr } from "react-icons/md";
import { type IconType } from "react-icons";

// ========== Types ==========
interface Feature {
  id: string;
  icon: IconType;
  title: string;
  input?: string;
  output: string | string[];
  details?: React.ReactNode;
}

interface CategoryData {
  category: string;
  icon: IconType;
  features: Feature[];
}

interface FeatureAccordionProps {
  feature: Feature;
  isOpen: boolean;
  onToggle: () => void;
}

interface HelpSidebarProps {
  data: CategoryData[];
  activeCategory: string;
  onCategoryClick: (category: string) => void;
}

// --- Sub-component: Descriptor Details ---
const DescriptorDetails = React.memo(() => (
  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
    <li>
      <strong>Molecular Weight:</strong> Avg. weight.
    </li>
    <li>
      <strong>Exact Mol. Weight:</strong> Precise weight w/ isotopes.
    </li>
    <li>
      <strong>Heavy Atom Count:</strong> Non-hydrogen atom count.
    </li>
    <li>
      <strong>Num Atoms:</strong> Total atoms including hydrogens.
    </li>
    <li>
      <strong>Molecular Formula:</strong> Elemental composition.
    </li>
    <li>
      <strong>Num Stereo Centers:</strong> Defined stereocenters.
    </li>
    <li>
      <strong>Num Unspecified Stereo:</strong> Undefined stereocenters.
    </li>
    <li>
      <strong>Ring Count:</strong> Total rings.
    </li>
    <li>
      <strong>Aliphatic Rings:</strong> Non-aromatic rings.
    </li>
    <li>
      <strong>Saturated Rings:</strong> Saturated rings.
    </li>
    <li>
      <strong>H-Bond Acceptors:</strong> H-bond accepting atoms.
    </li>
    <li>
      <strong>H-Bond Donors:</strong> H-bond donating atoms.
    </li>
    <li>
      <strong>Num Rotatable Bonds:</strong> Freely rotating bonds.
    </li>
    <li>
      <strong>TPSA:</strong> Topological polar surface area.
    </li>
    <li>
      <strong>LogP:</strong> Measure of hydrophobicity.
    </li>
    <li>
      <strong>Fraction Csp3:</strong> Fraction of sp³ carbons.
    </li>
    <li>
      <strong>Molar Refractivity:</strong> Polarizability descriptor.
    </li>
    <li>
      <strong>Element Counts:</strong> C, H, O, N, S, P, etc.
    </li>
    <li>
      <strong>O/N Ratio:</strong> O_N_Ratio feature.
    </li>
  </ul>
));

// --- Help Data (NO "uses") ---
const HELP_DATA: CategoryData[] = [
  {
    category: "CREATE",
    icon: FaPlus,
    features: [
      {
        id: "create-glycan",
        icon: FaAtom,
        title: "Glycan Molecule",
        input: "Click monosaccharides, bonds, and branching brackets.",
        output: ["SNFG Image", "SMILES string", "Interactive 3D Molecule"],
      },
      {
        id: "create-network",
        icon: FaNetworkWired,
        title: "Biosynthetic Networks",
        input: "List of glycan sequences in IUPAC format.",
        output: "Biosynthetic network graph (nodes = glycans, edges = reactions).",
      },
      {
        id: "convert",
        icon: FaExchangeAlt,
        title: "Interconvert between formats",
        input: "Glycan in IUPAC, GlycoCT, or WURCS.",
        output: ["IUPAC", "GlycoCT", "WURCS", "SMILES"],
      },
    ],
  },
  {
    category: "VISUALIZE",
    icon: MdViewInAr,
    features: [
      {
        id: "draw-2d",
        icon: FaPencilRuler,
        title: "2D Draw (SNFG)",
        input: "Glycan sequence in IUPAC.",
        output: "2D Symbol Nomenclature for Glycans (SNFG) diagram.",
      },
      {
        id: "visualize-3d",
        icon: FaCube,
        title: "3D Representation",
        input: "Glycan sequence in IUPAC.",
        output: "Interactive 3D molecule (ball-and-stick, spacefill/CPK, wireframe, stick).",
      },
      {
        id: "kegg",
        icon: FaRoute,
        title: "KEGG Pathway View",
        input: "KEGG pathway ID (e.g. hsa00510) or pathway name query.",
        output: "KEGG pathway image / diagram.",
      },
    ],
  },
  {
    category: "ANALYZE",
    icon: FaFlask,
    features: [
      {
        id: "analyze-monosaccharide",
        icon: FaVial,
        title: "Monosaccharide",
        input:
          "Monosaccharide + Rank (Kingdom, Phylum, Class, etc.) + Focus (e.g. Bacteria, E. coli).",
        output: [
          "Observed modifications on the monosaccharide",
          "Glycans and variants that contain the monosaccharide",
          "Connectivity and biosynthetic context",
        ],
      },
      {
        id: "analyze-glycan",
        icon: FaThList,
        title: "Glycan",
        input: "Glycan sequence in IUPAC.",
        output: [
          "Glycan class (O, N, free, lipid, lipid/free, or empty)",
          "GlyTouCan ID",
          "Contained motifs",
          "Taxonomy (species, phyla distribution)",
          "Disease associations (up/down regulation, sample type)",
        ],
      },
      
      {
        id: "descriptor",
        icon: FaChartBar,
        title: "Molecule Descriptors",
        input: "Glycan sequence in IUPAC.",
        output: [
          "Basic molecular properties (MW, formula, rings, HBD/HBA, TPSA, LogP, etc.)",
          "Elemental composition (Count_C/H/O/N/S/P, etc., O_N_Ratio)",
          "Glycan-specific motifs (pyranose/furanose rings, N-acetyl, carboxyl, sulfate)",
          "Optional fingerprint similarities",
          "Optional Fingerprint_Similarities_Error flag",
        ],
        details: <DescriptorDetails />,
      },
      
      
      {
        id: "motif-mutation",
        icon: FaDna,
        title: "Motif Mutation",
        input:
          "IUPAC sequence, mutation depth, mutant samples, mutation intensity (Normal / Extreme).",
        output: [
          "Dictionary of motif frequencies",
          "List of wild-type and mutated glycan sequences",
        ],
      },
    ],
  },
  {
    category: "COMPARE",
    icon: FaCodeCompare,
    features: [
      {
        id: "compare-fingerprints",
        icon: FaExchangeAlt,
        title: "Two glycans",
        input: "Two glycan sequences in IUPAC.",
        output: [
          "AtomPair fingerprint similarity",
          "Morgan_R2 similarity (radius 2)",
          "Morgan_R3 similarity (radius 3)",
          "RDKit path fingerprint similarity",
          "Torsion (Topological Torsion) similarity",
        ],
      },
    ],
  },
  {
    category: "ALIGN",
    icon: FaAlignJustify,
    features: [

      {
        id: "align-seq",
        icon: FaAlignJustify,
        title: "Glycan Sequences",
        input: "Two glycan sequences in IUPAC.",
        output: "Alignment score and aligned representation.",
      },
    ],
  },
  {
    category: "CLUSTER",
    icon: GrCluster,
    features: [
      {
        id: "glycan-multiple-clustering",
        icon: FaChartBar,
        title: "Cluster Three or more glycans",
        input:
          "List of monosaccharides with SMILES, fingerprint type (Morgan), radius, n_bits, linkage method, similarity metric.",
        output: ["Cluster assignments", "Heatmap", "Dendrogram"],
      },
      {
        id: "glycan-optimize-clustering",
        icon: FaChartBar,
        title: "Optimize the number of clusters",
        input:
          "List of monosaccharides with SMILES, fingerprint type (Morgan), radius, n_bits, linkage method, similarity metric.",
        output: ["Cluster assignments","Cluster count vs threshold (elbow plot)", "Heatmap", "Dendrogram"],
      },
      {
        id: "glycan-outliers-clustering",
        icon: FaChartBar,
        title: "Detect Outlier Glycans",
        input:
          "List of monosaccharides with SMILES, fingerprint type (Morgan), radius, n_bits, linkage method, similarity metric.",
        output: ["Potential outliers","Cluster assignments", "Heatmap", "Dendrogram"],
      },
    ],
  },
{
    category: "PREDICT",
    icon: FaBrain,
    features: [
      {
        id: "predict-immuno",
        icon: FaShieldAlt,
        title: "Immunogenicity Prediction",
        input: "Glycan IUPAC sequence.",
        output: [
          "Immunogenic or not",
          "Model confidence",
          "Predicted immunogenicity probability",
        ],
      },
      
    ],
  
  },
  
  {
    category: "CHAT",
    icon: RiChatAiLine,
    features: [
    
      {
        id: "glycan-gpt",
        icon: SiChatbot,
        title: "Chat",
        input: "Query",
        output: [
          "Answer based on Query"
        ],
      },
      
    ],
  
  },
  
  // {
  //   category: "BROWSE",
  //   icon: FaSearch,
  //   features: [
  //     {
  //       id: "browse-pubmed",
  //       icon: FaBook,
  //       title: "Research Papers with PubMed AI",
  //       input: "Search query (e.g. 'human milk oligosaccharides').",
  //       output: "Result summary, AI research co-pilot, literature list.",
  //     },
  //     {
  //       id: "dataset",
  //       icon: FaFileDownload,
  //       title: "Dataset Downloader",
  //       input: "Species (e.g. Homo_sapiens).",
  //       output:
  //         "Dataset of glycans with Species, Genus, Family, Order, Class, Phylum, Kingdom, Domain, and reference.",
  //     },
  //     {
  //       id: "pdb",
  //       icon: BsBoxes,
  //       title: "PDB Search",
  //       input: "PDB ID (e.g. 1H7L).",
  //       output: "Redirect / link to PDB structure page.",
  //     },
  //   {
  //       id: "history",
  //       icon: FaHistory,
  //    title: "Glycobiology History",
  //       input: "None.",
  //        output: "Interactive historical timeline of key glycobiology discoveries.",
  //     },
  //   ],
  // },
];

// --- Feature Accordion ---
const FeatureAccordion: React.FC<FeatureAccordionProps> = React.memo(({ feature, isOpen, onToggle }) => {
  const { icon: Icon, title, input, output, details } = feature;
  return (
    <div className="border border-slate-200 rounded-xl shadow-md bg-white/80 backdrop-blur-sm transition-all hover:shadow-xl">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`feature-${feature.id}`}
        className="w-full flex justify-between items-center p-5 text-left text-lg font-semibold text-slate-800 focus:outline-none"
      >
        <div className="flex items-center gap-4">
          <Icon className="text-blue-500 w-6 h-6" />
          <span>{title}</span>
        </div>
        <FaPlus
          className={`transition-transform duration-300 ${
            isOpen ? "rotate-45" : ""
          }`}
        />
      </button>
      <div
        id={`feature-${feature.id}`}
        className={`transition-all duration-500 ease-in-out grid ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-6 pt-2 border-t border-slate-200 text-slate-600 space-y-4">
            {input && (
              <div>
                <h4 className="font-bold text-slate-700">Input:</h4>
                <p className="pl-4 border-l-4 border-blue-300 text-sm">
                  {input}
                </p>
              </div>
            )}
            {output && (
              <div>
                <h4 className="font-bold text-slate-700">Output:</h4>
                <div className="pl-4 border-l-4 border-green-300 text-sm">
                  {Array.isArray(output) ? (
                    <ul className="list-disc list-inside">
                      {output.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{output}</p>
                  )}
                </div>
              </div>
            )}
            {details && (
              <div>
                <h4 className="font-bold text-slate-700">Details:</h4>
                <div className="text-sm">{details}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// --- Sidebar ---
const HelpSidebar: React.FC<HelpSidebarProps> = React.memo(
  ({ data, activeCategory, onCategoryClick }) => (
    <aside className="w-full md:w-64 lg:w-72 flex-shrink-0 md:sticky top-24 self-start">
      <div className="p-4 rounded-xl shadow-lg bg-white/60 backdrop-blur-lg border border-slate-200">
        <h3 className="font-bold text-slate-800 text-xl mb-2 px-2">Categories</h3>
        <ul className="space-y-1">
          {data.map(({ category, icon: Icon }) => (
            <li key={category}>
              <button
                onClick={() => onCategoryClick(category)}
                className={`w-full text-left flex items-center gap-3 p-2 rounded-lg font-medium transition ${
                  activeCategory === category
                    ? "bg-blue-500 text-white"
                    : "text-slate-600 hover:bg-blue-100 hover:text-blue-700"
                }`}
              >
                <Icon className="w-5 h-5" />
                {category}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
);

// --- Main Component ---
const Help: React.FC = () => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>(
    HELP_DATA[0]?.category || ""
  );
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const lowerSearch = searchTerm.toLowerCase();

  const filteredData = useMemo(
    () =>
      HELP_DATA.map((cat) => ({
        ...cat,
        features: cat.features.filter((feat) => {
          const inTitle = feat.title.toLowerCase().includes(lowerSearch);
          const inInput = feat.input?.toLowerCase().includes(lowerSearch);
          return inTitle || inInput;
        }),
      })).filter((cat) => cat.features.length > 0),
    [lowerSearch]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 768) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingEntry = entries.find((entry) => entry.isIntersecting);
        if (intersectingEntry) {
          setActiveCategory(intersectingEntry.target.id);
        }
      },
      { rootMargin: "-30% 0px -70% 0px", threshold: 0.1 }
    );

    const refs = sectionRefs.current;
    Object.values(refs).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      Object.values(refs).forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
      observer.disconnect();
    };
  }, []);

  const handleCategoryClick = useCallback((category: string) => {
    const element = sectionRefs.current[category];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveCategory(category);
    }
  }, []);

  const handleToggleSection = useCallback(
    (id: string) => {
      setOpenSection((prev) => (prev === id ? null : id));
    },
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-100 font-sans text-slate-700">
      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold text-slate-900">
            Help Center
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Explore features of GlycanBench with our interactive guide.
          </p>
          <div className="mt-6 max-w-xl mx-auto">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
              <input
                type="search"
                placeholder="Search for a feature..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          <HelpSidebar
            data={HELP_DATA}
            activeCategory={activeCategory}
            onCategoryClick={handleCategoryClick}
          />
          <main className="flex-1 min-w-0">
            {filteredData.length > 0 ? (
              <div className="space-y-16">
                {filteredData.map((categoryData) => (
                  <section
                    key={categoryData.category}
                    id={categoryData.category}
                    ref={(el: HTMLElement | null) => {
                      sectionRefs.current[categoryData.category] = el;
                    }}
                    className="scroll-mt-24"
                  >
                    <h2 className="text-3xl font-bold text-slate-800 mb-6 border-l-4 border-blue-500 pl-4">
                      {categoryData.category}
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {categoryData.features.map((feature) => (
                        <FeatureAccordion
                          key={feature.id}
                          feature={feature}
                          isOpen={openSection === feature.id}
                          onToggle={() => handleToggleSection(feature.id)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="text-center p-10 bg-white/60 rounded-xl border border-slate-200">
                <h3 className="text-2xl font-semibold text-slate-800">
                  No Results Found
                </h3>
                <p className="mt-2 text-slate-500">
                  Try a different search term.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Help;
