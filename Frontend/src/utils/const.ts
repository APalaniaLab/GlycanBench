export const BASE_URL =
  window.location.hostname === "localhost" ? "http://localhost:5000" : "";

// Utility function to extract error message from FastAPI responses
export const getErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { detail?: string; error?: string } } };
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail;
    }
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "An unexpected error occurred";
};