import { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import API from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  isAdmin: boolean;
  isComptable: boolean;
  isAssistant: boolean;
  canDelete: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem('saphir_user');
    return u ? JSON.parse(u) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('saphir_token'));

  function logout() {
    localStorage.removeItem('saphir_token');
    localStorage.removeItem('saphir_user');
    setToken(null);
    setUser(null);
  }

  const loadUser = useCallback(async () => {
    if (token) {
      try {
        const res = await API.get('/auth/me');
        setUser(res.data);
        localStorage.setItem('saphir_user', JSON.stringify(res.data));
      } catch {
        logout();
      }
    }
  }, [token]);

  useEffect(() => {
    if (token && !user) {
      loadUser();
    }
  }, [token, user, loadUser]);

  async function login(email: string, password: string) {
    const res = await API.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    localStorage.setItem('saphir_token', t);
    localStorage.setItem('saphir_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  return (
    <AuthContext.Provider value={{
      user, token, login, logout, loadUser,
      isAdmin: user?.role === 'admin',
      isComptable: user?.role === 'admin' || user?.role === 'comptable',
      isAssistant: user?.role === 'comptable',
      canDelete: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}
