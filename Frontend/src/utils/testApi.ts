/**
 * Simple API test utility for development
 */
import { ChatApiService } from '../services/chatApi';

export const testApiIntegration = async () => {
  
  try {
    // Test health endpoint
    const health = await ChatApiService.getHealthStatus();
    
    // Test tool examples endpoint
    const examples = await ChatApiService.getToolExamples();
    
    // Test tool capabilities endpoint
    const capabilities = await ChatApiService.getToolCapabilities();
    
    return true;
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    return false;
  }
};

// Auto-run in development
if (import.meta.env.DEV) {
  // Delay to ensure backend is ready
  setTimeout(() => {
    testApiIntegration();
  }, 2000);
}