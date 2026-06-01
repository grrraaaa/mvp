import axios from "axios";
<<<<<<< HEAD
import { getApiBaseUrl } from "@/lib/api/baseUrl";

export const apiClient = axios.create({
  baseURL: getApiBaseUrl() || undefined,
=======

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_URL,
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Автоматически добавлять токен
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
