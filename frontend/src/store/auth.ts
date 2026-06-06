import { create } from 'zustand';
import { api, setToken, clearToken, getToken } from '../lib/api';
import type { AuthUser } from '../lib/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadSession: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  login: async (username, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setToken(data.token);
      set({ user: data.user });
    } finally {
      set({ loading: false });
    }
  },
  logout: () => {
    clearToken();
    set({ user: null });
  },
  loadSession: async () => {
    if (!getToken()) {
      set({ initialized: true });
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch {
      clearToken();
    } finally {
      set({ initialized: true });
    }
  },
}));
