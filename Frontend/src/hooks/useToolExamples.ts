/**
 * Custom hook for managing tool examples with category support
 */
import { useState, useEffect } from 'react';
import { ChatApiService } from '../services/chatApi';
import type { ToolExamples, CategorizedTools } from '../services/chatApi';

export const useToolExamples = () => {
  const [toolExamples, setToolExamples] = useState<ToolExamples>({});
  const [categorizedTools, setCategorizedTools] = useState<CategorizedTools | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToolData = async () => {
      try {
        setLoading(true);
        
        // Fetch both categorized tools and examples
        const [categories, examples] = await Promise.all([
          ChatApiService.getToolCategories(),
          ChatApiService.getToolExamples()
        ]);
        
        setCategorizedTools(categories);
        setToolExamples(examples);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch tool data:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch tool data");
      } finally {
        setLoading(false);
      }
    };

    fetchToolData();
  }, []);

  /**
   * Get examples for selected tools
   */
  const getSelectedToolExamples = (selectedTools: string[]): string[] => {
    const examples: string[] = [];
    selectedTools.forEach(toolId => {
      const toolExample = toolExamples[toolId];
      if (toolExample && toolExample.examples) {
        examples.push(...toolExample.examples);
      }
    });
    return examples;
  };

  /**
   * Get examples for a specific tool
   */
  const getToolExamples = (toolId: string): string[] => {
    const toolExample = toolExamples[toolId];
    return toolExample?.examples || [];
  };

  /**
   * Get tool name by ID
   */
  const getToolName = (toolId: string): string => {
    const toolExample = toolExamples[toolId];
    return toolExample?.name || toolId;
  };

  /**
   * Get all categories with their tools
   */
  const getCategories = () => {
    return categorizedTools?.categories || {};
  };

  /**
   * Get tools for a specific category
   */
  const getToolsByCategory = (categoryName: string) => {
    const categories = getCategories();
    return categories[categoryName]?.tools || {};
  };

  return {
    toolExamples,
    categorizedTools,
    loading,
    error,
    getSelectedToolExamples,
    getToolExamples,
    getToolName,
    getCategories,
    getToolsByCategory,
  };
};