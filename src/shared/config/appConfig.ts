const DEFAULT_API_BASE_URL = "http://127.0.0.1:5001";

export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
};


