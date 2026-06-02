import React from "react";
import { motion } from "framer-motion";
import Tilt from "react-parallax-tilt";
import {
  FaRocket,
  FaUsers,
  FaTools,
  FaEye,
  FaSeedling,
  FaDatabase,
  FaEnvelope,
  FaGithub,
  FaUniversity,
  FaBookOpen,
} from "react-icons/fa";
import { type IconType } from "react-icons";

// ========== Types ==========
interface Feature {
  icon: IconType;
  title: string;
  desc: string;
}

interface IconWrapperProps {
  Icon: IconType;
}

interface FeatureCardProps {
  icon: IconType;
  title: string;
  desc: string;
}

// ========== Feature Cards ==========
const features: Feature[] = [
  {
    icon: FaRocket,
    title: "AI-Powered Predictions",
    desc: "Predict glycan immunogenicity using Graph Neural Network (GNN).",
  },
  {
    icon: FaUsers,
    title: "Glycan Visualization",
    desc: "Interactive 3D and SNFG rendering using IUPAC-condensed formats.",
  },
  {
    icon: FaTools,
    title: "Format Conversion & Descriptor Analysis",
    desc: "Switch between IUPAC, WURCS, GLYCOCT, SMILES with descriptor insights.",
  },
  {
    icon: FaSeedling,
    title: "Glycan Biosynthetic Networks",
    desc: "Visualize synthesis routes and analyze complexity.",
  },
  {
    icon: FaEye,
    title: "Sequence Alignment & Mutation Tools",
    desc: "Align glycans and simulate structural motif changes.",
  },
  {
    icon: FaDatabase,
    title: "Data & Research Integration",
    desc: "Explore curated datasets and trending glycan research.",
  },
];

// ========== Reusable Components ==========
const IconWrapper: React.FC<IconWrapperProps> = ({ Icon }) => (
  <Icon className="text-blue-600 text-3xl mb-4" aria-hidden="true" />
);

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, desc }) => (
  <Tilt
    tiltMaxAngleX={10}
    tiltMaxAngleY={10}
    glareEnable
    glareMaxOpacity={0.1}
    scale={1.02}
  >
    <article className="bg-white p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:ring-4 hover:ring-blue-200 transition-transform transform hover:scale-[1.03]">
      <IconWrapper Icon={Icon} />
      <h3 className="text-xl font-bold text-blue-700 mb-2 font-sans">
        {title}
      </h3>
      <p className="text-gray-600 font-sans">{desc}</p>
    </article>
  </Tilt>
);

// ========== Main Component ==========
const AboutUs: React.FC = () => {
  return (
    <section
      className="bg-gradient-to-br from-white to-blue-50 min-h-screen px-6 py-12 relative z-10 font-sans"
      aria-labelledby="team-heading"
    >
      <div className="max-w-6xl mx-auto text-center">
        {/* ====== Heading ====== */}
        <motion.h1
          id="team-heading"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-extrabold text-blue-800 mb-6 tracking-tight font-sans"
        >
          About{" "}
          <span className="text-5xl font-extrabold tracking-tight font-sans">
            <span className="text-blue-600">Glycan</span>
            <span className="text-blue-900">Bench</span>
          </span>
        </motion.h1>

        {/* ====== Description ====== */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-lg text-gray-700 mb-10 max-w-3xl mx-auto leading-relaxed font-sans"
        >
          GlycanBench is an innovative platform merging AI with glycomics to
          explore the complex world of carbohydrates. From prediction and
          visualization to conversion and pathway generation, GlycanBench equips
          researchers with intelligent tools for impactful analysis.
        </motion.p>

        {/* ====== Authors & Citation ====== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
          className="mb-14 flex justify-center"
        >
          <div className="relative w-full max-w-2xl">
            {/* Glow backdrop */}
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-blue-200 via-indigo-100 to-blue-100 opacity-50 blur-xl pointer-events-none" />

            <div className="relative bg-white border border-blue-100 rounded-2xl shadow-xl overflow-hidden">
              {/* Header band */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-5 text-white text-center">
                <h3 className="text-xl font-bold tracking-wide">Authors &amp; Citation</h3>
              </div>

              <div className="px-8 py-7 space-y-5 text-left">

                {/* Authors */}
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FaUsers className="text-blue-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-0.5">Authors</p>
                    <p className="text-slate-800 font-medium text-sm leading-relaxed">
                      Vigneshwaran CJ<sup>1</sup> &amp; Ashok Palaniappan<sup>1,2</sup>
                      <sup className="text-blue-600 font-bold">∗</sup>
                    </p>
                  </div>
                </div>

                {/* Affiliations */}
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FaUniversity className="text-blue-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-0.5">Affiliations</p>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      <sup>1</sup> Systems Computational Biology Lab
                      &nbsp;&bull;&nbsp;
                      <sup>2</sup> Bioinformatics Center
                    </p>
                    <p className="text-slate-500 text-sm">
                      School of Chemical &amp; Biotechnology, SASTRA Deemed University
                    </p>
                  </div>
                </div>

                {/* Citation */}
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <FaBookOpen className="text-blue-600 text-sm" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-0.5">Citation</p>
                    <p className="text-slate-700 text-sm italic leading-relaxed">
                      GlycanBench: integrated resource for working with glycans,{" "}
                      <span className="not-italic font-medium text-slate-500">2026 (submitted)</span>
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-blue-50" />

                {/* Contact + GitHub */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="mailto:apalania@scbt.sastra.edu"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                      <FaEnvelope className="text-blue-500 text-xs" />
                    </span>
                    <span className="underline underline-offset-2">apalania@scbt.sastra.edu</span>
                    <sup className="text-blue-400 text-xs">∗</sup>
                  </a>

                  <a
                    href="https://github.com/APalaniaLab/GlycanBench"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-700 transition-colors group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                      <FaGithub className="text-slate-600 group-hover:text-blue-600 text-xs transition-colors" />
                    </span>
                    <span className="underline underline-offset-2">APalaniaLab/GlycanBench</span>
                  </a>
                </div>

              </div>
            </div>
          </div>
        </motion.div>

        {/* ====== Features Grid ====== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mt-4 text-left">
          {features.map(({ icon, title, desc }, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + idx * 0.1, duration: 0.6 }}
            >
              <FeatureCard icon={icon} title={title} desc={desc} />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default AboutUs;
