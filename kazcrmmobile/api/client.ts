import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

export const tokenStore = {
  async getAccess() {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefresh() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async setTokens(access: string, refresh: string) {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, access),
      SecureStore.setItemAsync(REFRESH_KEY, refresh),
    ]);
  },
  async setAccess(access: string) {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};

let onForceLogout: (() => void) | null = null;
export function setForceLogoutHandler(fn: (() => void) | null) {
  onForceLogout = fn;
}

const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  // Don't attach token to refresh calls (would be redundant + could cause loops).
  if (config.url?.includes("/auth/refresh")) return config;
  const token = await tokenStore.getAccess();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const refreshToken = await tokenStore.getRefresh();
      if (!refreshToken) return null;
      const { data } = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        { timeout: 15000 }
      );
      await tokenStore.setTokens(data.accessToken, data.refreshToken);
      return data.accessToken as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !original.url?.includes("/auth/")) {
      original._retry = true;
      const fresh = await refreshAccessToken();
      if (fresh) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${fresh}`;
        return api.request(original);
      }
      await tokenStore.clear();
      onForceLogout?.();
    }
    return Promise.reject(error);
  }
);

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: string };
};

export const login = (email: string, password: string) =>
  api.post<AuthPayload>("/auth/login", { email, password });

export const register = (name: string, email: string, password: string) =>
  api.post<AuthPayload>("/auth/register", { name, email, password });

export const logoutApi = (refreshToken: string | null) =>
  api.post("/auth/logout", refreshToken ? { refreshToken } : {});

export const getMe = () => api.get<{ user: AuthPayload["user"] }>("/auth/me");

export const getTickets = (params?: Record<string, string>) =>
  api.get("/tickets", { params });

export const getTicket = (id: string) => api.get(`/tickets/${id}`);

export const createTicket = (data: { title: string; description: string; clientId: string }) =>
  api.post("/tickets", data);

export const updateTicket = (id: string, data: Record<string, string>) =>
  api.patch(`/tickets/${id}`, data);

export const getClients = (search?: string) =>
  api.get("/clients", { params: search ? { search } : {} });

export const getClient = (id: string) => api.get(`/clients/${id}`);

export const getOperators = () => api.get("/users/operators");

export const getAnalytics = () => api.get("/analytics");

export default api;
