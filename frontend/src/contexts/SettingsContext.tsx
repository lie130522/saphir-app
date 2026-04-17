import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';
type Language = 'fr' | 'en';

interface SettingsContextType {
  theme: Theme;
  language: Language;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('saphir_theme') as Theme) || 'light');
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('saphir_lang') as Language) || 'fr');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('saphir_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('saphir_lang', language);
  }, [language]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const setLanguage = (lang: Language) => setLanguageState(lang);

  return (
    <SettingsContext.Provider value={{ theme, language, toggleTheme, setLanguage }}>
      {children}
    </SettingsContext.Provider>
  );
}
