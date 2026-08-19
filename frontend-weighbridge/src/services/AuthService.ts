import { create } from 'zustand';
import apiClient from './api';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  applicationAccess: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isOfflineLogin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isOfflineLogin: false,
  
  login: async (email: string, password: string) => {
    try {
      // 1. Try online login
      const res = await apiClient.post('/auth/login', {
        email,
        password,
        application: 'WEIGHBRIDGE'
      });
      
      const { token, user, offlineHash } = res.data;
      
      // Store token
      localStorage.setItem('token', token);
      
      // Cache user and hash for offline login
      const ipcRenderer = (window as any).ipcRenderer;
      if (ipcRenderer && offlineHash) {
        await ipcRenderer.invoke('db-query', 
          `INSERT OR REPLACE INTO auth_cache (id, username, email, name, role, applicationAccess, localHash) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [user.id, user.username, user.email, user.name, user.role, JSON.stringify(user.applicationAccess), offlineHash]
        );
      }
      
      set({ user, token, isAuthenticated: true, isOfflineLogin: false });
    } catch (error: any) {
      // If network error, try offline login
      if (!error.response) {
        const ipcRenderer = (window as any).ipcRenderer;
        if (!ipcRenderer) throw new Error('Offline login not supported in this environment');
        
        // Lookup by email or username
        const res = await ipcRenderer.invoke('db-query', 
          `SELECT * FROM auth_cache WHERE email = ? OR username = ?`,
          [email, email]
        );
        
        if (res.success && res.data && res.data.length > 0) {
          const cachedUser = res.data[0];
          
          // Verify password via main process
          const verifyRes = await ipcRenderer.invoke('verify-password', password, cachedUser.localHash);
          if (verifyRes.success && verifyRes.isValid) {
            const user: User = {
              id: cachedUser.id,
              name: cachedUser.name,
              email: cachedUser.email,
              username: cachedUser.username,
              role: cachedUser.role,
              applicationAccess: JSON.parse(cachedUser.applicationAccess || '[]')
            };
            
            // Set offline token equivalent
            const dummyToken = 'OFFLINE_TOKEN';
            localStorage.setItem('token', dummyToken);
            set({ user, token: dummyToken, isAuthenticated: true, isOfflineLogin: true });
            return;
          }
        }
        
        throw new Error('Invalid credentials or no offline access found.');
      } else {
        // Authentic API error
        throw new Error(error.response?.data?.message || 'Invalid username or password.');
      }
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false, isOfflineLogin: false });
  },
  
  checkAuth: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      if (token === 'OFFLINE_TOKEN') {
        // If we were offline, we could rehydrate from last known or require login again.
        // For security, if the app restarted while offline, we require login again.
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, isOfflineLogin: false });
        return;
      }
      
      const res = await apiClient.get('/auth/me');
      if (res.data) {
        set({ user: res.data, isAuthenticated: true, isOfflineLogin: false });
      }
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false, isOfflineLogin: false });
    }
  },
}));
