import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaDna,
  FaChartBar,
  FaExclamationTriangle,
  FaQuestionCircle,
  FaBrain,
  FaRocket,
  FaShieldAlt,
  FaCopy,
  FaDownload,
  FaStar,
  FaCheckCircle,
  FaInfoCircle,
  FaAtom,
} from "react-icons/fa";
import { CgSpinner } from "react-icons/cg";
import { IoClose } from "react-icons/io5";
import { BASE_URL, getErrorMessage } from "../../../utils/const";

// TypeScript interfaces
interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  colorClass?: string;
  gradient?: boolean;
}

interface PredictionResult {
  prediction: string;
  score: number;
  motifs_detected?: string[];
  processed_sequence?: string;
  unknown_sugars?: Record<string, number>;
  unknown_bonds?: Record<string, number>;
  unknown_glycowords?: Record<string, number>;
}

interface ResultsDisplayProps {
  result: PredictionResult;
  sequence: string;
  onClear: () => void;
}

interface Example {
  name: string;
  sequence: string;
  description: string;
  category: "human" | "bacterial" | "xenogeneic";
}

const InfoCard: React.FC<InfoCardProps> = ({ 
  icon, 
  title, 
  children, 
  colorClass = "bg-slate-100",
  gradient = false 
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`rounded-xl p-6 shadow-sm border border-slate-200/50 ${
      gradient 
        ? "bg-gradient-to-br from-white to-slate-50" 
        : colorClass
    } hover:shadow-md transition-shadow duration-300`}
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-white/80 text-slate-600 shadow-sm">
        {icon}
      </div>
      <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
    </div>
    <div className="space-y-3">{children}</div>
  </motion.div>
);

// Enhanced confidence badge component
const ConfidenceBadge: React.FC<{ score: number }> = ({ score }) => {
  const confidence = Math.max(score, 1 - score);
  const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low';
  
  const getConfig = () => {
    switch (confidenceLevel) {
      case 'high':
        return {
          color: 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-200',
          icon: <FaCheckCircle className="w-3 h-3" />,
          pulse: 'animate-pulse'
        };
      case 'medium':
        return {
          color: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200',
          icon: <FaInfoCircle className="w-3 h-3" />,
          pulse: ''
        };
      default:
        return {
          color: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200',
          icon: <FaExclamationTriangle className="w-3 h-3" />,
          pulse: ''
        };
    }
  };
  
  const config = getConfig();
  
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border font-semibold ${config.color} ${config.pulse}`}>
      {config.icon}
      <span className="capitalize">{confidenceLevel} Confidence ({(confidence * 100).toFixed(1)}%)</span>
    </span>
  );
};

// Motif detection component
const MotifDisplay: React.FC<{ motifs: string[] }> = ({ motifs }) => {
  if (!motifs || motifs.length === 0) return null;
  
  const getMotifInfo = (motif: string) => {
    switch (motif) {
      case 'AlphaGal':
        return { 
          name: 'Alpha-Gal', 
          description: 'Xenogeneic epitope (Gal(α1-3)Gal)',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <FaShieldAlt className="w-3 h-3" />
        };
      case 'NonHumanSialicAcid':
        return { 
          name: 'Non-Human Sialic Acid', 
          description: 'Neu5Gc - immunogenic in humans',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <FaExclamationTriangle className="w-3 h-3" />
        };
      case 'ComplexNGlycan':
        return { 
          name: 'Complex N-Glycan', 
          description: 'Complex branched N-linked structure',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <FaAtom className="w-3 h-3" />
        };
      default:
        return { 
          name: motif, 
          description: 'Detected structural motif',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <FaDna className="w-3 h-3" />
        };
    }
  };
  
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-slate-700 flex items-center gap-2">
        <FaStar className="w-4 h-4 text-amber-500" />
        Detected Motifs ({motifs.length})
      </h4>
      <div className="space-y-2">
        {motifs.map((motif, index) => {
          const info = getMotifInfo(motif);
          return (
            <div key={index} className={`p-3 rounded-lg border ${info.color}`}>
              <div className="flex items-center gap-2 mb-1">
                {info.icon}
                <span className="font-semibold text-sm">{info.name}</span>
              </div>
              <p className="text-xs opacity-80">{info.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, sequence, onClear }) => {
  const isImmunogenic = result.prediction === "Immunogenic";
  const immunogenicityProbability = result.score * 100;
  const confidence = Math.max(result.score, 1 - result.score);
  const glycanTokens = sequence.split(/([()\[\]])/).filter(Boolean);

  const unknownSugars = result.unknown_sugars || {};
  const unknownBonds = result.unknown_bonds || {};
  const unknownGlycowords = result.unknown_glycowords || {};

  const totalUnknownSugars = Object.values(unknownSugars).reduce(
    (sum, count) => sum + count,
    0
  );
  const totalUnknownBonds = Object.values(unknownBonds).reduce(
    (sum, count) => sum + count,
    0
  );
  const totalUnknownGlycowords = Object.values(unknownGlycowords).reduce(
    (sum, count) => sum + count,
    0
  );

  const hasUnknowns =
    totalUnknownSugars > 0 ||
    totalUnknownBonds > 0 ||
    totalUnknownGlycowords > 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadResults = () => {
    const data = {
      sequence,
      prediction: result.prediction,
      score: result.score,
      confidence: confidence * 100,
      motifs_detected: result.motifs_detected || [],
      processed_sequence: result.processed_sequence,
      unknown_components: {
        sugars: unknownSugars,
        bonds: unknownBonds,
        glycowords: unknownGlycowords
      },
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glycan_prediction_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="relative w-full bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl shadow-xl p-6 space-y-6 max-w-full overflow-hidden"
    >
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
            <FaBrain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              MPNN Analysis Complete
            </h2>
            <p className="text-slate-600 text-sm">Message Passing Neural Network Prediction</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={downloadResults}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Download Results"
          >
            <FaDownload className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear Results"
          >
            <IoClose className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main prediction result */}
      <div className={`relative p-6 rounded-2xl text-center overflow-hidden ${
        isImmunogenic 
          ? "bg-gradient-to-br from-red-50 to-rose-100 border border-red-200" 
          : "bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200"
      }`}>
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            {isImmunogenic ? (
              <FaShieldAlt className="w-8 h-8 text-red-600" />
            ) : (
              <FaCheckCircle className="w-8 h-8 text-emerald-600" />
            )}
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              MPNN Prediction
            </p>
          </div>
          
          <p className={`text-5xl font-black mb-4 ${
            isImmunogenic ? "text-red-700" : "text-emerald-700"
          }`}>
            {result.prediction}
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {immunogenicityProbability.toFixed(1)}%
              </p>
              <p className="text-sm text-slate-600">Probability Score</p>
            </div>
            <div className="w-px h-12 bg-slate-300"></div>
            <div className="text-center">
              <ConfidenceBadge score={result.score} />
            </div>
          </div>
          
          <div className="w-full bg-white/50 rounded-full h-3 mb-2">
            <motion.div
              className={`h-3 rounded-full ${
                isImmunogenic 
                  ? "bg-gradient-to-r from-red-500 to-red-600" 
                  : "bg-gradient-to-r from-emerald-500 to-emerald-600"
              }`}
              initial={{ width: "0%" }}
              animate={{ width: `${immunogenicityProbability}%` }}
              transition={{ duration: 1.2, ease: "circOut", delay: 0.3 }}
            />
          </div>
          <p className="text-xs text-slate-600">
            Threshold: 50% • Score &gt; 50% = Immunogenic
          </p>
        </div>
      </div>

      {/* Motifs detection */}
      {result.motifs_detected && result.motifs_detected.length > 0 && (
        <InfoCard
          icon={<FaStar />}
          title="Structural Motifs"
          colorClass="bg-gradient-to-br from-amber-50 to-yellow-50"
          gradient={true}
        >
          <MotifDisplay motifs={result.motifs_detected} />
        </InfoCard>
      )}

      {/* Detailed probability analysis */}
      <InfoCard
        icon={<FaChartBar />}
        title="Probability Analysis"
        gradient={true}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
            <div>
              <p className="font-semibold text-slate-800">Immunogenic Probability</p>
              <p className="text-sm text-slate-600">MPNN model confidence for immunogenic classification</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-800">{immunogenicityProbability.toFixed(2)}%</p>
              <p className="text-sm text-slate-500">Score: {result.score.toFixed(4)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="font-semibold text-emerald-800">Non-Immunogenic</p>
              <p className="text-2xl font-bold text-emerald-700">
                {(100 - immunogenicityProbability).toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="font-semibold text-red-800">Immunogenic</p>
              <p className="text-2xl font-bold text-red-700">
                {immunogenicityProbability.toFixed(1)}%
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <FaBrain className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-800">MPNN Model Architecture</span>
            </div>
            <p className="text-sm text-blue-700">
              Message Passing Neural Network trained on glycan immunogenicity data. 
              The model processes glycan structures as molecular graphs, using message passing 
              to capture structural relationships and predict immune response potential.
            </p>
          </div>
        </div>
      </InfoCard>

      {/* Sequence tokenization */}
      <InfoCard 
        icon={<FaDna />} 
        title="Sequence Processing"
        gradient={true}
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Input Sequence</p>
              <button
                onClick={() => copyToClipboard(sequence)}
                className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                title="Copy sequence"
              >
                <FaCopy className="w-3 h-3" />
              </button>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-sm break-all">
              {sequence}
            </div>
          </div>
          
          {result.processed_sequence && result.processed_sequence !== sequence && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Processed Sequence</p>
                <button
                  onClick={() => copyToClipboard(result.processed_sequence!)}
                  className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                  title="Copy processed sequence"
                >
                  <FaCopy className="w-3 h-3" />
                </button>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 font-mono text-sm break-all">
                {result.processed_sequence}
              </div>
            </div>
          )}
          
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Tokenization</p>
            <p className="text-xs text-slate-600 mb-3">
              The sequence is tokenized into constituent parts for graph neural network processing.
            </p>
            <div className="flex flex-wrap gap-2">
              {glycanTokens.map((part, index) => (
                <motion.span
                  key={`${part}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="px-3 py-1.5 text-xs bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 rounded-lg font-mono border border-slate-300 shadow-sm"
                >
                  {part}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </InfoCard>

      {/* Unknown components */}
      <InfoCard
        icon={<FaQuestionCircle />}
        title="Vocabulary Analysis"
        colorClass={hasUnknowns ? "bg-gradient-to-br from-amber-50 to-orange-50" : "bg-gradient-to-br from-green-50 to-emerald-50"}
        gradient={true}
      >
        {!hasUnknowns ? (
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-emerald-200">
            <FaCheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">All Components Recognized</p>
              <p className="text-sm text-emerald-700">
                All sugars, bonds, and glycowords are present in the training vocabulary.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-amber-200">
              <FaExclamationTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">
                  {totalUnknownSugars + totalUnknownBonds + totalUnknownGlycowords} Unknown Components Detected
                </p>
                <p className="text-sm text-amber-700">
                  Some components were not seen during model training and may affect prediction accuracy.
                </p>
              </div>
            </div>

            {totalUnknownSugars > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FaAtom className="w-4 h-4" />
                  Unknown Sugars ({totalUnknownSugars})
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(unknownSugars).map(([tok, count]) => (
                    <span
                      key={tok}
                      className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm font-mono"
                    >
                      {tok} <span className="text-amber-600 font-bold">×{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {totalUnknownBonds > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FaRocket className="w-4 h-4" />
                  Unknown Bonds ({totalUnknownBonds})
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(unknownBonds).map(([tok, count]) => (
                    <span
                      key={tok}
                      className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-sm font-mono"
                    >
                      {tok} <span className="text-amber-600 font-bold">×{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {totalUnknownGlycowords > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FaDna className="w-4 h-4" />
                  Unknown Glycowords ({totalUnknownGlycowords})
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {Object.entries(unknownGlycowords).map(([gw, count]) => (
                    <div
                      key={gw}
                      className="p-2 bg-white border border-amber-300 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-slate-700">{gw}</span>
                        <span className="text-xs text-amber-600 font-bold">×{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                  <strong>Glycowords:</strong> 5-token sliding windows (sugar–bond–sugar–bond–sugar) 
                  used by the MPNN model that were not observed in the training vocabulary.
                </p>
              </div>
            )}
          </div>
        )}
      </InfoCard>
    </motion.div>
  );
};

const GlycanAnalysisPage: React.FC = () => {
  const [sequence, setSequence] = useState<string>("");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const examples: Example[] = [
    {
      name: "Complex Human N-Glycan",
      sequence: "Gal(b1-4)GlcNAc(b1-2)[Gal(b1-4)GlcNAc(b1-4)]Man(a1-3)[NeuNAc(a2-3)Gal(b1-4)GlcNAc(b1-2)[NeuNAc(a2-3)Gal(b1-4)GlcNAc(b1-6)]Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc",
      description: "Typical complex biantennary N-glycan with sialic acid and fucose",
      category: "human"
    },
    {
      name: "Bacterial Polysaccharide",
      sequence: "[GalNAcAN(a1-2)]Rha(a1-2)Rha(a1-3)Rha(a1-2)Rha(a1-3)GlcNAc(b1-3)Rha",
      description: "Bacterial cell wall polysaccharide with rhamnose repeats",
      category: "bacterial"
    },
    {
      name: "Xenogeneic Alpha-Gal",
      sequence: "Gal(a1-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)Man(b1-4)GlcNAc",
      description: "Alpha-Gal epitope - highly immunogenic in humans",
      category: "xenogeneic"
    },
    {
      name: "High-Mannose N-Glycan",
      sequence: "Man(a1-2)Man(a1-3)[Man(a1-2)Man(a1-6)]Man(a1-6)[Man(a1-3)]Man(b1-4)GlcNAc(b1-4)GlcNAc",
      description: "High-mannose type N-glycan commonly found in yeast",
      category: "human"
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'human': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'bacterial': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'xenogeneic': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAnalyze = async (seq?: string): Promise<void> => {
    const sequenceToAnalyze = seq || sequence;

    if (!sequenceToAnalyze) {
      setError("Please enter a glycan sequence in IUPAC-condensed format.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const validation = await axios.post(`${BASE_URL}/api/validate`, {
        sequence: sequenceToAnalyze,
      });

      if (!validation.data.valid) {
        console.warn("Validation warning:", validation.data.reason);
      }

      const response = await axios.post<PredictionResult>(`${BASE_URL}/api/predict`, {
        sequence: sequenceToAnalyze,
      });

      setResult(response.data);
      setSequence(sequenceToAnalyze);
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error) || 
        "An API error occurred. Please ensure the backend server is running and accessible.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleSequence: string): void => {
    setSequence(exampleSequence);
    handleAnalyze(exampleSequence);
  };

  const handleClear = (): void => {
    setSequence("");
    setResult(null);
    setError("");
  };

  const handleSequenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setSequence(e.target.value);
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* Left Panel - Input */}
          <div className="w-full space-y-6">
            {/* Enhanced Header */}
            <motion.header
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                    <FaBrain className="text-2xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      MPNN Predictor
                    </h1>
                    <p className="text-base text-slate-600 font-medium">
                      Glycan Immunogenicity Analysis
                    </p>
                  </div>
                </div>
                
                <p className="text-slate-600 leading-relaxed mb-4 text-sm">
                  Analyze glycan structures using a Message Passing Neural Network (MPNN) 
                  to predict their potential to trigger immune responses—essential for 
                  biotherapeutic development and glycoengineering applications.
                </p>
                
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <FaBrain className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-800 text-sm">MPNN Architecture</p>
                    <p className="text-blue-700 text-xs">Message Passing Neural Network for molecular graphs</p>
                  </div>
                </div>
              </div>
            </motion.header>

            {/* Enhanced Input Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-xl space-y-4"
            >
              <div className="space-y-3">
                <label
                  htmlFor="sequence-input"
                  className="block font-bold text-slate-800 text-base flex items-center gap-2"
                >
                  <FaDna className="w-4 h-4 text-blue-600" />
                  Glycan Sequence (IUPAC-condensed)
                </label>
                <textarea
                  id="sequence-input"
                  value={sequence}
                  onChange={handleSequenceChange}
                  placeholder="e.g., Gal(a1-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)Man(b1-4)GlcNAc"
                  className="w-full p-3 h-32 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono text-sm bg-white/90 backdrop-blur-sm shadow-inner resize-none"
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between text-sm">
                  <p className="text-slate-500">
                    Enter IUPAC-condensed glycan notation
                  </p>
    
                </div>
              </div>

              <motion.button
                onClick={() => handleAnalyze()}
                disabled={isLoading || !sequence}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isLoading ? (
                  <>
                    <CgSpinner className="animate-spin h-5 w-5" />
                    <span>Analyzing with MPNN...</span>
                  </>
                ) : (
                  <>
                    <FaRocket />
                    <span>Analyze Immunogenicity</span>
                  </>
                )}
              </motion.button>
            </motion.div>

            {/* Enhanced Examples Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <FaStar className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-800 text-base">Example Sequences</h3>
              </div>
              
              <div className="grid gap-3">
                {examples.map((ex, index) => (
                  <motion.button
                    key={ex.name}
                    onClick={() => handleExampleClick(ex.sequence)}
                    disabled={isLoading}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="text-left p-3 bg-white/90 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-md disabled:opacity-50 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors text-sm">
                          {ex.name}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(ex.category)}`}>
                          {ex.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{ex.description}</p>
                    {/* Sequence is hidden from UI but still available for functionality */}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Enhanced Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 shadow-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <FaExclamationTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-800 mb-1 text-sm">Analysis Error</h4>
                      <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                      <button
                        onClick={() => setError("")}
                        className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panel - Results */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              {result ? (
                <ResultsDisplay
                  result={result}
                  sequence={sequence}
                  onClear={handleClear}
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center border-2 border-dashed border-slate-300 rounded-2xl p-12 h-full flex flex-col justify-center items-center bg-white/50 backdrop-blur-sm min-h-[400px]"
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="mb-6"
                  >
                    <FaChartBar className="text-5xl text-slate-300" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-500 mb-2">
                    Ready for Analysis
                  </h3>
                  <p className="text-slate-400 max-w-md leading-relaxed text-sm">
                    Enter a glycan sequence or select an example to begin MPNN-based 
                    immunogenicity prediction. Results will appear here with detailed 
                    analysis and confidence metrics.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
};

export default GlycanAnalysisPage;