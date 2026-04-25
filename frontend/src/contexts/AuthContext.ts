import { createContext } from 'react';
import type { User } from '../types';

export interface AuthContextType {
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
