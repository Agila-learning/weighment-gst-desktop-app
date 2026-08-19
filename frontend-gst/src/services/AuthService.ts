import { create } from 'zustand';
import apiClient from '../api/client';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  applicationAccess: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  login: (token, user) => {
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  checkAuth: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const res = await apiClient.get('/auth/me');
      if (res.data) {
        set({ user: res.data, isAuthenticated: true });
      }
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));
