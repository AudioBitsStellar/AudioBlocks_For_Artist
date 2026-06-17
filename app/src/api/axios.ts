import axios, { AxiosInstance } from "axios";
import Cookies from "js-cookie";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  // useAuth.tsx stores the JWT in the `audioblocks_jwt` cookie; localStorage
  // "token" is kept as a fallback for any other login path that uses it.
  return Cookies.get("audioblocks_jwt") || localStorage.getItem("token") || null;
}

export const createApiClient = async (): Promise<AxiosInstance> => {
  const apiClient = axios.create({
    baseURL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:3000/api",
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Read the token fresh on every request, not just at client creation time,
  // so a login that happens after this module loads is picked up.
  apiClient.interceptors.request.use((config) => {
    const token = getToken();
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
          Cookies.remove("audioblocks_jwt");
          localStorage.removeItem("token");
          // window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
};
