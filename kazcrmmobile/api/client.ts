import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";

if (!process.env.EXPO_PUBLIC_API_URL && !__DEV__) {
  // eslint-disable-next-line no-console
  console.warn(
    "EXPO_PUBLIC_API_URL is not set in this build — falling back to localhost. " +
      "Set it via EAS env vars before publishing a release."
  );
}

const ACCESS_KEY = "accessToken";
const REFRESH_KEY = "refreshToken";

export const tokenStore = {
  async getAccess() {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefresh() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async setTokens(access: string, refresh: string | null) {
    const ops: Promise<void>[] = [SecureStore.setItemAsync(ACCESS_KEY, access)];
    if (refresh) ops.push(SecureStore.setItemAsync(REFRESH_KEY, refresh));
    else ops.push(SecureStore.deleteItemAsync(REFRESH_KEY));
    await Promise.all(ops);
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

const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use(async (config) => {
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
        { timeout: 20000 }
      );
      const access = data.accessToken ?? data.token;
      const refresh = data.refreshToken ?? null;
      if (!access) return null;
      await tokenStore.setTokens(access, refresh);
      return access as string;
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

export type AuthUser = { id: string; name: string; email: string; role: string };

/**
 * Server-shape adapter. The hardened backend returns
 *   { accessToken, refreshToken, user }
 * The legacy backend (still on Render until env var update) returns
 *   { token, user }
 * Normalises to the new shape so the rest of the app doesn't care.
 */
export type AuthPayload = {
  accessToken: string;
  refreshToken: string | null;
  user: AuthUser;
};

function normalizeAuthResponse(raw: unknown): AuthPayload {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const accessToken = (obj.accessToken as string) ?? (obj.token as string) ?? "";
  const refreshToken = (obj.refreshToken as string) ?? null;
  const user = obj.user as AuthUser;
  if (!accessToken || !user) {
    throw new Error("Invalid auth response from server");
  }
  return { accessToken, refreshToken, user };
}

export const login = async (email: string, password: string): Promise<AuthPayload> => {
  const { data } = await api.post("/auth/login", { email, password });
  return normalizeAuthResponse(data);
};

export const register = async (name: string, email: string, password: string): Promise<AuthPayload> => {
  const { data } = await api.post("/auth/register", { name, email, password });
  return normalizeAuthResponse(data);
};

/**
 * Best-effort server-side logout. Old backend has no /auth/logout endpoint
 * (404). We ignore that and let the caller still clear local tokens.
 */
export const logoutApi = async (refreshToken: string | null): Promise<void> => {
  try {
    await api.post("/auth/logout", refreshToken ? { refreshToken } : {});
  } catch {
    // Old server: no /auth/logout — fine, client clears tokens locally.
  }
};

export const getMe = () => api.get<{ user: AuthUser }>("/auth/me");

export const getTickets = (params?: Record<string, string>) =>
  api.get("/tickets", { params });

export const getTicket = (id: string) => api.get(`/tickets/${id}`);

export const createTicket = (data: { title: string; description: string; clientId: string }) =>
  api.post("/tickets", data);

// Old backend exposes PUT /tickets/:id only; new backend supports both PUT and PATCH.
export const updateTicket = (id: string, data: Record<string, string>) =>
  api.put(`/tickets/${id}`, data);

export const getClients = (search?: string) =>
  api.get("/clients", { params: search ? { search } : {} });

export const getClient = (id: string) => api.get(`/clients/${id}`);

export const getOperators = () => api.get("/users/operators");

export const getAnalytics = () => api.get("/analytics");

export default api;
