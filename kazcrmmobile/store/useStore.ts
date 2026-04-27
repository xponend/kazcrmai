import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { login as apiLogin, getMe } from "../api/client";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Store = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

export const useStore = create<Store>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await apiLogin(email, password);
    await SecureStore.setItemAsync("token", data.token);
    set({ user: data.user, token: data.token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("token");
    set({ user: null, token: null });
  },

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      if (token) {
        const { data } = await getMe();
        set({ user: data.user, token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync("token");
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
