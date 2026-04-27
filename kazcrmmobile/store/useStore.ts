import { create } from "zustand";
import {
  login as apiLogin,
  getMe,
  logoutApi,
  tokenStore,
  setForceLogoutHandler,
} from "../api/client";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Store = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

export const useStore = create<Store>((set) => {
  // Wire force-logout from the axios interceptor into the store.
  setForceLogoutHandler(() => {
    set({ user: null });
  });

  return {
    user: null,
    isLoading: true,

    login: async (email, password) => {
      const { data } = await apiLogin(email, password);
      await tokenStore.setTokens(data.accessToken, data.refreshToken);
      set({ user: data.user });
    },

    logout: async () => {
      const refreshToken = await tokenStore.getRefresh();
      try {
        await logoutApi(refreshToken);
      } catch {
        // Server-side revocation best-effort; always clear locally.
      }
      await tokenStore.clear();
      set({ user: null });
    },

    restoreSession: async () => {
      try {
        const access = await tokenStore.getAccess();
        if (!access) {
          set({ isLoading: false });
          return;
        }
        const { data } = await getMe();
        set({ user: data.user, isLoading: false });
      } catch {
        // getMe will trigger refresh-then-401-clear via interceptor; if we land
        // here, both paths failed.
        await tokenStore.clear();
        set({ user: null, isLoading: false });
      }
    },
  };
});
