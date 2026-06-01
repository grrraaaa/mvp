import axios from "axios";
import { getApiBaseUrl } from "@/lib/api/baseUrl";

export const apiClient = axios.create({
  baseURL: getApiBaseUrl() || undefined,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Автоматически добавлять токен
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
