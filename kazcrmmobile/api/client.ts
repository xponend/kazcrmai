import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (email: string, password: string) =>
  api.post("/auth/login", { email, password });

export const getMe = () => api.get("/auth/me");

export const getTickets = (params?: Record<string, string>) =>
  api.get("/tickets", { params });

export const getTicket = (id: string) => api.get(`/tickets/${id}`);

export const createTicket = (data: { title: string; description: string; clientId: string }) =>
  api.post("/tickets", data);

export const updateTicket = (id: string, data: Record<string, string>) =>
  api.put(`/tickets/${id}`, data);

export const getClients = (search?: string) =>
  api.get("/clients", { params: search ? { search } : {} });

export const getClient = (id: string) => api.get(`/clients/${id}`);

export const getOperators = () => api.get("/users/operators");

export const getAnalytics = () => api.get("/analytics");

export default api;
