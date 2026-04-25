import { createContext } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'fr' | 'en';

export interface SettingsContextType {
  theme: Theme;
  language: Language;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);
