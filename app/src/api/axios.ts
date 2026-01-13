import axios, { AxiosInstance } from "axios";

export const createApiClient = async (): Promise<AxiosInstance> => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const apiClient = axios.create({
    baseURL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:3000/api",
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  // Request interceptor
  apiClient.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
