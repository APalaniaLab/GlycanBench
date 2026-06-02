import React, { useState, useRef, useEffect } from "react"; 
import { BASE_URL } from "../../../utils/const";
import { ChatApiService } from "../../../services/chatApi";
import type { ChatRequest, ChatResponse, ToolExamples, CategorizedTools } from "../../../services/chatApi";
import { useToolExamples } from "../../../hooks/useToolExamples";
import { 
  FaPaperPlane, 
  FaRobot, 
  FaUser, 
  FaPlus, 
  FaTimes, 
  FaSearch, 
  FaBook, 
  FaFlask, 
  FaDatabase, 
  FaClock, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaInfoCircle, 
  FaLightbulb,
  FaStar,
  FaChevronDown,
  FaChevronUp,
  FaCopy,
  FaDownload
} from "react-icons/fa";

// ================= Enhanced Components =================
const ConfidenceBadge: React.FC<{ confidence?: string }> = ({ confidence }) => {
  if (!confidence) return null;
  
  const getConfidenceConfig = (conf: string) => {
    switch (conf.toLowerCase()) {
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
      case 'low': 
        return { 
          color: 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200',
          icon: <FaExclamationTriangle className="w-3 h-3" />,
          pulse: ''
        };
      default: 
        return { 
          color: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-200',
          icon: <FaInfoCircle className="w-3 h-3" />,
          pulse: ''
        };
    }
  };
  
  const config = getConfidenceConfig(confidence);
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border font-medium ${config.color} ${config.pulse}`}>
      {config.icon}
      <span className="capitalize">{confidence} Confidence</span>
    </span>
  );
};

const ProcessingTime: React.FC<{ time?: number }> = ({ time }) => {
  if (!time) return null;
  
  const getTimeColor = (t: number) => {
    if (t < 1) return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200';
    if (t < 3) return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border-blue-200';
    return 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200';
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border font-medium ${getTimeColor(time)}`}>
      <FaClock className="w-3 h-3" />
      <span>{time.toFixed(2)}s</span>
    </span>
  );
};

// ================= Types =================
interface Message {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  accession?: string;
  wurcs?: string;
  iupac?: string;
  glycoct?: string;
  mass?: number;
  formula?: string;
  toolsUsed?: string[];
  processingTime?: number;
  confidence?: string;
  timestamp?: Date;
}

interface ChatRequestPayload {
  message: string;
  use_pubmed: boolean;
  use_arxiv: boolean;
  use_glycan_db: boolean;
  use_structure_analysis: boolean;
  use_synthesis: boolean;
}

interface ChatResponsePayload {
  reply: string;
  accession?: string;
  wurcs?: string;
  iupac?: string;
  glycoct?: string;
  mass?: number;
  formula?: string;
  tools_used?: string[];
  processing_time?: number;
  confidence?: string;
}

interface ErrorResponse {
  error: string;
  error_code: string;
  details?: string;
  timestamp: string;
}

// ================= Component =================
const GlycomicsChat: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Tool selection state - category-based only
  const [showTools, setShowTools] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showExamples, setShowExamples] = useState(false);

  // Use custom hook for tool examples and categories
  const { getToolExamples, getCategories, loading: toolsLoading, error: toolsError } = useToolExamples();

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Group tools by category for UI
  const getToolsByCategory = () => {
    const categories = getCategories();
    const toolsByCategory: Record<string, any[]> = {};
    
    Object.entries(categories).forEach(([categoryName, categoryData]) => {
      toolsByCategory[categoryName] = Object.entries(categoryData.tools).map(([toolId, toolData]) => ({
        id: toolId,
        icon: getToolIcon(toolId),
        ...toolData
      }));
    });
    
    return toolsByCategory;
  };

  // Get tool icon based on tool ID
  const getToolIcon = (toolId: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      pubmed: <FaBook className="w-3 h-3" />,
      arxiv: <FaSearch className="w-3 h-3" />,
      synthesis: <FaFlask className="w-3 h-3" />,
      structure_analysis: <FaDatabase className="w-3 h-3" />,
      glycan_db: <FaDatabase className="w-3 h-3" />
    };
    return iconMap[toolId] || <FaDatabase className="w-3 h-3" />;
  };

  const toolsByCategory = getToolsByCategory();

  const examplePrompts = [
    "What is N-linked glycosylation and how does it work?",
    "How are glycans analyzed using mass spectrometry?",
    "What are the differences between N- and O-glycans?",
    "Explain the role of glycans in immune recognition",
    "What are the latest advances in glycan synthesis?"
  ];

  // Auto scroll
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // ================= Tool Management =================
  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev => {
      const newSelection = prev.includes(categoryName)
        ? prev.filter(cat => cat !== categoryName)
        : [...prev, categoryName];
      
      setShowExamples(newSelection.length > 0);
      return newSelection;
    });
  };

  const clearAllTools = () => {
    setSelectedCategories([]);
    setShowExamples(false);
  };
  // ================= Input Validation =================
  const validateInput = (text: string): string | null => {
    if (!text || !text.trim()) {
      return "Message cannot be empty";
    }
    
    if (text.length > 5000) {
      return "Message is too long (maximum 5000 characters)";
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script.*?>.*?<\/script>/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i,
      /onload\s*=/i,
      /onerror\s*=/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        return "Invalid characters detected in message";
      }
    }
    
    return null;
  };

  // ================= Send Message =================
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    
    // Validate input
    const validationError = validateInput(userText);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setInput("");
    setError("");
    setShowTools(false);

    const newMessage: Message = { 
      role: "user", 
      content: userText,
      tools: selectedCategories.length > 0 ? selectedCategories : undefined,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    setLoading(true);

    try {
      // Auto-detect GlyTouCan accession and enable relevant tools
      const isGlyTouCan = /^G\d{5}[A-Z]{2}$/.test(userText);
      
      const payload: ChatRequest = {
        message: userText,
        // Category mode (intelligent selection)
        use_literature: selectedCategories.includes("Literature"),
        use_databases: selectedCategories.includes("Databases") || isGlyTouCan,
        // Individual tools disabled in favor of intelligent selection
        use_pubmed: false,
        use_arxiv: false,
        use_glycan_db: false,
        use_structure_analysis: false,
        use_synthesis: false,
      };

      const responseData = await ChatApiService.sendMessage(payload);
      
      setMessages(prev => [
        ...prev,
        { 
          role: "assistant", 
          content: responseData.reply,
          accession: responseData.accession,
          wurcs: responseData.wurcs,
          iupac: responseData.iupac,
          glycoct: responseData.glycoct,
          mass: responseData.mass,
          formula: responseData.formula,
          toolsUsed: responseData.tools_used,
          processingTime: responseData.processing_time,
          confidence: responseData.confidence,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to reach the server. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ================= Input Handlers =================
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleExampleClick = (prompt: string) => {
    setInput(prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };
  // ================= UI =================
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header - Responsive */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FaRobot className="text-white w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <FaStar className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Chat
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  AI-powered glycomics research assistant
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area - Responsive */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full relative">
        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6"
          style={{ 
            paddingBottom: showTools ? "400px" : showExamples ? "200px" : "120px",
            minHeight: "calc(100vh - 120px)"
          }}
        >
          {messages.length === 0 && (
            <div className="text-center space-y-6 sm:space-y-8 py-8 sm:py-12 px-4">
              <div className="space-y-3 sm:space-y-4">
                <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-lg">
                    <FaRobot className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                    <FaStar className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                    Welcome to Chat
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto leading-relaxed px-4">
                    Ask questions about glycomics, glycobiology, and carbohydrate research. 
                    Use smart tools to enhance your queries with scientific literature.
                  </p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 justify-center">
                  <FaLightbulb className="w-3 h-3 sm:w-4 sm:h-4 text-amber-500" />
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">Try these examples:</span>
                </div>
                <div className="grid gap-2 sm:gap-3 max-w-2xl mx-auto">
                  {examplePrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(prompt)}
                      className="text-left p-3 sm:p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group shadow-sm hover:shadow-md"
                    >
                      <div className="text-xs sm:text-sm text-gray-700 group-hover:text-blue-700 font-medium">
                        {prompt}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className="space-y-2 sm:space-y-3">
              <div className={`flex gap-2 sm:gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Enhanced Avatar - Responsive */}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                  msg.role === "user" 
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white" 
                    : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600"
                }`}>
                  {msg.role === "user" ? <FaUser className="w-3 h-3 sm:w-4 sm:h-4" /> : <FaRobot className="w-3 h-3 sm:w-4 sm:h-4" />}
                </div>

                {/* Enhanced Message Content - Responsive */}
                <div className={`flex-1 space-y-2 min-w-0 ${msg.role === "user" ? "text-right" : ""}`}>
                  <div className={`inline-block max-w-[90%] sm:max-w-[85%] ${
                    msg.role === "user" 
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-md shadow-lg" 
                      : "bg-white border border-gray-200 rounded-2xl rounded-tl-md shadow-sm hover:shadow-md transition-shadow"
                  } px-3 sm:px-4 py-2 sm:py-3`}>
                    <div className={`text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words ${
                      msg.role === "user" ? "text-white" : "text-gray-900"
                    }`}>
                      {msg.content}
                    </div>
                  </div>

                  {/* Enhanced Structure Data Display - Responsive */}
                  {msg.role === "assistant" && (msg.wurcs || msg.iupac || msg.glycoct || msg.mass || msg.formula) && (
                    <div className="space-y-2 sm:space-y-3 max-w-[90%] sm:max-w-[85%]">
                      {msg.wurcs && (
                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gray-200 rounded-full flex items-center justify-center">
                              <FaDatabase className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-gray-600" />
                            </div>
                            <span className="font-semibold text-gray-700 text-xs sm:text-sm">WURCS</span>
                            <button className="ml-auto p-1 hover:bg-gray-200 rounded transition-colors">
                              <FaCopy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-500" />
                            </button>
                          </div>
                          <div className="break-all text-gray-800 font-mono text-[10px] sm:text-xs bg-white p-2 sm:p-3 rounded-lg border overflow-x-auto">{msg.wurcs}</div>
                        </div>
                      )}
                      
                      {msg.iupac && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                              <FaBook className="w-2.5 h-2.5 text-blue-600" />
                            </div>
                            <span className="font-semibold text-blue-800 text-sm">IUPAC</span>
                            <button className="ml-auto p-1 hover:bg-blue-100 rounded transition-colors">
                              <FaCopy className="w-3 h-3 text-blue-600" />
                            </button>
                          </div>
                          <div className="break-all text-blue-900 text-xs bg-white p-3 rounded-lg border border-blue-100">{msg.iupac}</div>
                        </div>
                      )}
                      
                      {msg.glycoct && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                              <FaFlask className="w-2.5 h-2.5 text-green-600" />
                            </div>
                            <span className="font-semibold text-green-800 text-sm">GlycoCT</span>
                            <button className="ml-auto p-1 hover:bg-green-100 rounded transition-colors">
                              <FaCopy className="w-3 h-3 text-green-600" />
                            </button>
                          </div>
                          <div className="break-all text-green-900 font-mono text-xs bg-white p-3 rounded-lg border border-green-100">{msg.glycoct}</div>
                        </div>
                      )}
                      
                      {(msg.mass || msg.formula) && (
                        <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                              <FaInfoCircle className="w-2.5 h-2.5 text-purple-600" />
                            </div>
                            <span className="font-semibold text-purple-800 text-sm">Properties</span>
                          </div>
                          <div className="space-y-2">
                            {msg.mass && (
                              <div className="bg-white p-3 rounded-lg border border-purple-100">
                                <span className="font-semibold text-purple-900 text-sm">Mass:</span>
                                <span className="ml-2 text-purple-800 text-sm">{msg.mass.toFixed(2)} Da</span>
                              </div>
                            )}
                            {msg.formula && (
                              <div className="bg-white p-3 rounded-lg border border-purple-100">
                                <span className="font-semibold text-purple-900 text-sm">Formula:</span>
                                <span className="ml-2 text-purple-800 text-sm font-mono">{msg.formula}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Enhanced Metadata Display */}
                  {msg.role === "assistant" && (msg.confidence || msg.processingTime || msg.toolsUsed) && (
                    <div className="flex flex-wrap gap-2 text-xs mt-3 max-w-[85%]">
                      <ConfidenceBadge confidence={msg.confidence} />
                      <ProcessingTime time={msg.processingTime} />
                      {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border border-purple-200 font-medium">
                          <FaDatabase className="w-3 h-3" />
                          <span>{msg.toolsUsed.join(", ")}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Enhanced Category indicators */}
                  {msg.tools && msg.tools.length > 0 && (
                    <div className={`flex gap-2 text-xs ${msg.role === "user" ? "justify-end" : ""}`}>
                      {msg.tools.map(categoryName => (
                        <span key={categoryName} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200 font-medium">
                          <FaStar className="w-2.5 h-2.5" />
                          <span className="text-xs">{categoryName}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <FaRobot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm font-medium">Chat is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Error Display */}
        {error && (
          <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 max-w-4xl w-full px-4 z-10">
            <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl shadow-lg backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaExclamationTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-red-800 text-sm mb-1">Something went wrong</div>
                  <div className="text-red-700 text-sm leading-relaxed">{error}</div>
                  <button
                    onClick={() => setError("")}
                    className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Fixed Input Area */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200/50 z-20 shadow-lg">
          <div className="max-w-4xl mx-auto">
            {/* Enhanced Tools Panel */}
            {showTools && (
              <div 
                className="border-b border-gray-100/50 bg-white/90 backdrop-blur-sm max-h-[70vh] overflow-y-auto relative"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#93c5fd #f1f5f9'
                }}
              >
                {/* Scroll indicator */}
                <div className="absolute top-2 right-4 z-20 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded-full backdrop-blur-sm">
                  <FaChevronDown className="w-3 h-3 animate-bounce" />
                </div>
                
                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                        <FaStar className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Smart Research Tools</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">Select categories and AI will automatically choose the best tools for your research question.</p>
                  </div>
                  
                  {/* Loading state */}
                  {toolsLoading && (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3 text-gray-500">
                        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Loading smart tools...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Error state */}
                  {toolsError && (
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6">
                      <div className="flex items-center gap-3 text-red-800">
                        <FaExclamationTriangle className="w-5 h-5" />
                        <span className="text-sm font-semibold">Failed to load tools</span>
                      </div>
                      <p className="text-sm text-red-700 mt-2">{toolsError}</p>
                    </div>
                  )}
                  
                  {/* Enhanced Smart Category Selection */}
                  {!toolsLoading && !toolsError && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sticky top-0 z-10 bg-white/95 backdrop-blur-sm shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <FaStar className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">AI-Powered Selection</span>
                        </div>
                        <p className="text-sm text-blue-700 leading-relaxed">
                          Choose categories below and our AI will intelligently select the most relevant tools based on your specific question.
                        </p>
                      </div>
                      
                      <div className="grid gap-4 pb-4">
                        {Object.entries(toolsByCategory).map(([categoryName, categoryTools]) => (
                          <button
                            key={categoryName}
                            onClick={() => toggleCategory(categoryName)}
                            className={`w-full p-6 rounded-xl border-2 transition-all duration-300 text-left group ${
                              selectedCategories.includes(categoryName)
                                ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg transform scale-[1.02]'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50 hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                    selectedCategories.includes(categoryName)
                                      ? 'bg-blue-100'
                                      : 'bg-gray-100 group-hover:bg-gray-200'
                                  }`}>
                                    {categoryName === 'Literature' ? (
                                      <FaBook className={`w-5 h-5 ${selectedCategories.includes(categoryName) ? 'text-blue-600' : 'text-gray-600'}`} />
                                    ) : (
                                      <FaDatabase className={`w-5 h-5 ${selectedCategories.includes(categoryName) ? 'text-blue-600' : 'text-gray-600'}`} />
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-lg font-bold text-gray-900 mb-1">
                                      {categoryName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {categoryName === 'Literature' 
                                        ? 'AI will search scientific literature and research papers'
                                        : 'AI will query glycan databases and analyze structural information'
                                      }
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {categoryTools.map(tool => (
                                    <span key={tool.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      selectedCategories.includes(categoryName)
                                        ? 'bg-white text-blue-700 border border-blue-200'
                                        : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200'
                                    }`}>
                                      {tool.icon}
                                      <span>{tool.name}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-4 transition-all ${
                                selectedCategories.includes(categoryName)
                                  ? 'border-blue-600 bg-blue-600 scale-110'
                                  : 'border-gray-300 group-hover:border-gray-400'
                              }`}>
                                {selectedCategories.includes(categoryName) && (
                                  <FaCheckCircle className="w-4 h-4 text-white" />
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Selected Categories Display */}
            {selectedCategories.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-100/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FaStar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">Active Smart Categories</span>
                  </div>
                  <button
                    onClick={clearAllTools}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedCategories.map(categoryName => (
                    <span key={categoryName} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200 font-medium shadow-sm">
                      <FaStar className="w-3 h-3" />
                      <span>{categoryName}</span>
                      <button
                        onClick={() => toggleCategory(categoryName)}
                        className="hover:bg-blue-200 rounded-full p-1 transition-colors ml-1"
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Example Questions Display */}
            {showExamples && selectedCategories.length > 0 && (
              <div className="px-6 py-4 border-b border-gray-100/50 bg-gradient-to-r from-amber-50/50 to-yellow-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <FaLightbulb className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Suggested Questions</span>
                </div>
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {(() => {
                    let examples: string[] = [];
                    // Get examples from all tools in selected categories
                    selectedCategories.forEach(categoryName => {
                      const categoryTools = toolsByCategory[categoryName] || [];
                      categoryTools.forEach(tool => {
                        const toolExamples = getToolExamples(tool.id);
                        examples.push(...toolExamples);
                      });
                    });
                    
                    return examples.slice(0, 6).map((example, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setInput(example);
                          setShowExamples(false);
                          if (textareaRef.current) {
                            textareaRef.current.focus();
                          }
                        }}
                        className="text-left p-3 rounded-lg text-sm text-amber-800 hover:bg-amber-100 transition-colors border border-amber-200 bg-white/80 backdrop-blur-sm font-medium"
                      >
                        {example}
                      </button>
                    ));
                  })()}
                </div>
                {(() => {
                  let totalExamples = 0;
                  selectedCategories.forEach(categoryName => {
                    const categoryTools = toolsByCategory[categoryName] || [];
                    categoryTools.forEach(tool => {
                      totalExamples += getToolExamples(tool.id).length;
                    });
                  });
                  
                  return totalExamples > 6 && (
                    <div className="text-sm text-amber-700 mt-3 text-center font-medium">
                      +{totalExamples - 6} more examples available
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Enhanced Input Row - Responsive */}
            <div className="p-3 sm:p-6">
              <div className="flex items-end gap-2 sm:gap-4 bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200 rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                {/* Enhanced Tools Button - Responsive */}
                <button
                  onClick={() => setShowTools(!showTools)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-sm hover:shadow-md ${
                    showTools || selectedCategories.length > 0
                      ? "border-blue-500 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform scale-105"
                      : "border-gray-300 hover:border-gray-400 hover:bg-white text-gray-600"
                  }`}
                >
                  <FaPlus className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${showTools ? "rotate-45" : ""}`} />
                </button>

                {/* Enhanced Text Input Container - Responsive */}
                <div className="flex-1 min-w-0">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Ask about glycomics, glycobiology, or carbohydrate research..."
                    disabled={loading}
                    maxLength={5000}
                    className="w-full resize-none border-0 focus:outline-none bg-transparent text-gray-900 placeholder-gray-500 text-xs sm:text-sm leading-6 max-h-32 font-medium"
                    style={{ minHeight: "28px" }}
                  />
                  
                  {/* Enhanced Character Counter - Responsive */}
                  {input.length > 4500 && (
                    <div className={`text-[10px] sm:text-xs mt-2 font-medium ${input.length > 5000 ? 'text-red-600' : 'text-gray-500'}`}>
                      {input.length}/5000 characters
                    </div>
                  )}
                </div>

                {/* Enhanced Send Button - Responsive */}
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim() || input.length > 5000}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 shadow-lg hover:shadow-xl disabled:shadow-sm transform hover:scale-105 disabled:scale-100"
                >
                  <FaPaperPlane className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlycomicsChat;