"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://kazcrm.onrender.com/api";

const ACCESS_KEY = "kc_access";
const REFRESH_KEY = "kc_refresh";
const USER_KEY = "kc_user";

export type AuthUser = { id: string; name: string; email: string; role: string };

export const tokenStore = {
  getAccess: () => (typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY)),
  getRefresh: () => (typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY)),
  getUser: () => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthUser; } catch { return null; }
  },
  set: (access: string, refresh: string | null, user: AuthUser) => {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    else localStorage.removeItem(REFRESH_KEY);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

let onForceLogout: (() => void) | null = null;
export function setForceLogoutHandler(fn: (() => void) | null) {
  onForceLogout = fn;
}

let refreshInFlight: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) return null;
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const access = data.accessToken ?? data.token;
      const refresh = data.refreshToken ?? null;
      const user = tokenStore.getUser();
      if (!access || !user) return null;
      tokenStore.set(access, refresh, user);
      return access as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  payload?: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
    if (payload && typeof payload === "object" && "code" in payload) {
      this.code = String((payload as { code?: string }).code ?? "");
    }
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retried = false
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const access = tokenStore.getAccess();
  if (access && !path.startsWith("/auth/refresh")) {
    headers.set("Authorization", `Bearer ${access}`);
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    const fresh = await tryRefresh();
    if (fresh) return request<T>(path, init, true);
    tokenStore.clear();
    onForceLogout?.();
  }
  if (!res.ok) {
    let payload: unknown = null;
    try { payload = await res.json(); } catch { /* ignore */ }
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: string }).error ?? "")
        : "") || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, payload);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Normalises both legacy {token,user} and new {accessToken,refreshToken,user}.
function normalizeAuth(raw: unknown): { accessToken: string; refreshToken: string | null; user: AuthUser } {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const accessToken = (obj.accessToken as string) ?? (obj.token as string) ?? "";
  const refreshToken = (obj.refreshToken as string) ?? null;
  const user = obj.user as AuthUser;
  if (!accessToken || !user) throw new Error("Invalid auth response");
  return { accessToken, refreshToken, user };
}

export const api = {
  // ─────────── auth ───────────
  async login(email: string, password: string) {
    const data = await request<unknown>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const norm = normalizeAuth(data);
    tokenStore.set(norm.accessToken, norm.refreshToken, norm.user);
    return norm;
  },
  async logout() {
    const refreshToken = tokenStore.getRefresh();
    try {
      await request("/auth/logout", {
        method: "POST",
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
    } catch { /* legacy backend has no /logout — fine */ }
    tokenStore.clear();
  },
  me: () => request<{ user: AuthUser }>("/auth/me"),

  // ─────────── tickets ───────────
  listTickets: (params: Record<string, string> = {}) => {
    const q = new URLSearchParams(params).toString();
    return request<{ tickets: any[]; total: number; page: number; pages: number }>(
      `/tickets${q ? `?${q}` : ""}`
    );
  },
  getTicket: (id: string) => request<{ ticket: any; history: any[] }>(`/tickets/${id}`),
  createTicket: (data: { title: string; description: string; clientId: string }) =>
    request<{ ticket: any; aiResult: any; aiFailed?: boolean }>("/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTicket: (id: string, data: Record<string, string>) =>
    request<{ ticket: any }>(`/tickets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  addComment: (id: string, comment: string) =>
    request<{ entry: any }>(`/tickets/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),

  // ─────────── ticket AI ───────────
  aiPreview: (data: { title: string; description: string }) =>
    request<{ classification: any; priority: any }>(`/tickets/preview`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  aiSuggestReply: (id: string) =>
    request<{ suggestions: Array<{ tone: string; body: string }> }>(`/tickets/${id}/ai/suggest-reply`, { method: "POST" }),
  aiSummarize: (id: string) =>
    request<{ summary: string; keyPoints: string[] }>(`/tickets/${id}/ai/summarize`, { method: "POST" }),
  aiSimilar: (id: string, limit = 5) =>
    request<{ similar: any[] }>(`/tickets/${id}/ai/similar?limit=${limit}`),
  aiPlaybook: (id: string) =>
    request<{ steps: Array<{ index: number; action: string; detail: string }>; estimatedMinutes: number; escalateIf: string[]; similarCount: number }>(
      `/tickets/${id}/ai/playbook`,
      { method: "POST" }
    ),
  aiTranslate: (id: string, to: "ru" | "kk" | "en") =>
    request<{ title: string; description: string; lang: string }>(
      `/tickets/${id}/ai/translate?to=${to}`,
      { method: "POST" }
    ),

  // ─────────── clients / users ───────────
  listClients: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<{ clients: any[] }>(`/clients${q}`);
  },
  getClient: (id: string) => request<{ client: any }>(`/clients/${id}`),
  aiClientProfile: (id: string) =>
    request<{ profile: any; sampleSize: number }>(`/clients/${id}/ai/profile`, { method: "POST" }),
  listOperators: () => request<{ operators: any[] }>("/users/operators"),

  // ─────────── analytics + insights ───────────
  analytics: () => request<any>("/analytics"),
  digest: (hours = 24) => request<any>(`/insights/digest?hours=${hours}`),

  // ─────────── chat ───────────
  chat: (message: string, history: Array<{ role: "user" | "assistant"; content: string }> = []) =>
    request<{ reply: string; contextStats: any; contextSize: number }>("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    }),
};
