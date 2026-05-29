"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  api,
  tokenStore,
  setForceLogoutHandler,
  probeServerCapabilities,
  type AuthUser,
} from "./api";

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  /** True when the backend exposes the new AI endpoints (digest/chat/playbook/...). */
  aiAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    setForceLogoutHandler(() => {
      setUser(null);
      router.replace("/login");
    });
    // Probe server capabilities once per app load — independent of auth.
    probeServerCapabilities().then((c) => setAiAvailable(c.aiAvailable));

    const cached = tokenStore.getUser();
    if (!cached) {
      setLoading(false);
      return;
    }
    setUser(cached);
    api
      .me()
      .then(({ user: u }) => setUser(u))
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Route guard: redirect on auth state changes once we've finished loading.
  useEffect(() => {
    if (loading) return;
    // The /landing/* client portal is public and manages its own auth/redirects.
    if (pathname?.startsWith("/landing")) return;
    // Client-role users belong to the portal, not the staff admin app.
    if (user?.role === "client") {
      router.replace("/landing/portal");
      return;
    }
    if (!user && pathname !== "/login") router.replace("/login");
    if (user && pathname === "/login") router.replace("/");
  }, [user, loading, pathname, router]);

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        aiAvailable,
        login: async (email, password) => {
          const norm = await api.login(email, password);
          setUser(norm.user);
          router.replace("/");
        },
        logout: async () => {
          await api.logout();
          setUser(null);
          router.replace("/login");
        },
        updateProfile: async (data) => {
          const updated = await api.updateProfile(data);
          setUser(updated);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
