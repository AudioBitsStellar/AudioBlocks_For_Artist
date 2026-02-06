import axios, { AxiosInstance } from "axios";

export const createApiClient = async (): Promise<AxiosInstance> => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const apiClient = axios.create({
    baseURL:
      "https://audioblock-backend-v2.onrender.com/api",
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  // Request interceptor
  apiClient.interceptors.request.use((config) => {
    // Read token dynamically from localStorage on every request
    const currentToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    
    // Explicitly remove Authorization header for auth endpoints to avoid issues
    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/register')) {
      delete config.headers.Authorization;
    }
    
    return config;
  });

  // Response interceptor
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          // window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
};
