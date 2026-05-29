import { create } from "zustand";
import {
  login as apiLogin,
  changePassword as apiChangePassword,
  getMe,
  logoutApi,
  tokenStore,
  setForceLogoutHandler,
  type AuthUser,
} from "../api/client";

type Store = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

export const useStore = create<Store>((set) => {
  setForceLogoutHandler(() => {
    set({ user: null });
  });

  return {
    user: null,
    isLoading: true,

    login: async (email, password) => {
      const payload = await apiLogin(email, password);
      await tokenStore.setTokens(payload.accessToken, payload.refreshToken);
      set({ user: payload.user });
    },

    changePassword: async (currentPassword, newPassword) => {
      const payload = await apiChangePassword(currentPassword, newPassword);
      // Persist the rotated tokens exactly like login so the session stays valid.
      await tokenStore.setTokens(payload.accessToken, payload.refreshToken);
      set({ user: payload.user });
    },

    logout: async () => {
      const refreshToken = await tokenStore.getRefresh();
      await logoutApi(refreshToken);
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
        await tokenStore.clear();
        set({ user: null, isLoading: false });
      }
    },
  };
});
