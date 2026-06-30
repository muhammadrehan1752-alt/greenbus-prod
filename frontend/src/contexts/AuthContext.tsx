import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { authApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; display_name: string; gender?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem('auth');
    if (raw) {
      try {
        const { token: t, user: u } = JSON.parse(raw);
        setToken(t);
        setUser(u);
        if (t) connectSocket(t);
        // Verify token is still valid
        authApi.me().then((r) => {
          setUser(r.data);
        }).catch(() => {
          localStorage.removeItem('auth');
          setToken(null);
          setUser(null);
        });
      } catch {
        localStorage.removeItem('auth');
      }
    }
    setIsLoading(false);
  }, []);

  const persist = (t: string, u: User) => {
    localStorage.setItem('auth', JSON.stringify({ token: t, user: u }));
    setToken(t);
    setUser(u);
    connectSocket(t);
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    persist(data.token, data.user);
  }, []);

  const register = useCallback(async (data: { email: string; password: string; display_name: string; gender?: string }) => {
    const { data: res } = await authApi.register(data);
    persist(res.token, res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth');
    disconnectSocket();
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      const raw = localStorage.getItem('auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem('auth', JSON.stringify({ ...parsed, user: updated }));
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, isAuthenticated: !!token && !!user,
      isLoading, login, register, logout, updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
