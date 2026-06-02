/**
 * Chat API service for interacting with the modular backend
 */
import { BASE_URL } from "../utils/const";

// Types
export interface ChatRequest {
  message: string;
  // Individual tool selection (backward compatibility)
  use_pubmed?: boolean;
  use_arxiv?: boolean;
  use_glycan_db?: boolean;
  use_structure_analysis?: boolean;
  use_synthesis?: boolean;
  // Category-based selection (new intelligent mode)
  use_literature?: boolean;
  use_databases?: boolean;
}

export interface ChatResponse {
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

export interface ToolCapability {
  name: string;
  description: string;
  examples: string[];
}

export interface ToolCapabilities {
  [key: string]: ToolCapability;
}

export interface ToolExamples {
  [key: string]: {
    name: string;
    examples: string[];
  };
}

export interface ToolCategory {
  name: string;
  description: string;
  tools: ToolCapabilities;
}

export interface CategorizedTools {
  categories: {
    [categoryName: string]: ToolCategory;
  };
  timestamp: string;
}

// API Functions
export class ChatApiService {
  /**
   * Check API health status
   */
  static async getHealthStatus(): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Send a chat message to the backend
   */
  static async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${BASE_URL}/api/GlycomicsChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all tool capabilities
   */
  static async getToolCapabilities(): Promise<ToolCapabilities> {
    const response = await fetch(`${BASE_URL}/api/tools/capabilities`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tool capabilities: ${response.status}`);
    }

    const data = await response.json();
    return data.tools;
  }

  /**
   * Get example questions for all tools
   */
  static async getToolExamples(): Promise<ToolExamples> {
    const response = await fetch(`${BASE_URL}/api/tools/capabilities/examples`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tool examples: ${response.status}`);
    }

    const data = await response.json();
    return data.examples;
  }


  /**
   * Test tool capability query
   */
  static async testCapabilityQuery(request: ChatRequest): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/test-capability-query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Test query failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Validate a glycan accession
   */
  static async validateAccession(accession: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/validate-accession`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accession }),
    });

    if (!response.ok) {
      throw new Error(`Validation failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Test external tools connectivity
   */
  static async testExternalTools(): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/test-tools`);
    
    if (!response.ok) {
      throw new Error(`Tool test failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get tools organized by categories
   */
  static async getToolCategories(): Promise<CategorizedTools> {
    const response = await fetch(`${BASE_URL}/api/tools/categories`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tool categories: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get tools for a specific category
   */
  static async getToolsByCategory(categoryName: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/tools/categories/${categoryName}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tools for category ${categoryName}: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Test intelligent tool selection
   */
  static async testIntelligentSelection(query: string, use_literature: boolean, use_databases: boolean): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/test-intelligent-selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        use_literature,
        use_databases
      }),
    });

    if (!response.ok) {
      throw new Error(`Intelligent selection test failed: ${response.status}`);
    }

    return response.json();
  }
}