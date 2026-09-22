import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import ru from './locales/ru.json';
import uzCyrl from './locales/uz-Cyrl.json';
import uzLatn from './locales/uz-Latn.json';
import { useSettingsStore } from '../stores/settingsStore';

type Locale = 'ru' | 'uz-Cyrl' | 'uz-Latn';

const translations: Record<Locale, any> = {
  'ru': ru,
  'uz-Cyrl': uzCyrl,
  'uz-Latn': uzLatn,
};

interface I18nContextProps {
  t: (key: string) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language, setLanguage } = useSettingsStore();
  const [locale, setLocaleState] = useState<Locale>(language as Locale || 'ru');

  useEffect(() => {
    if (language !== locale) {
      setLocaleState(language as Locale);
    }
  }, [language]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setLanguage(newLocale);
  }, [setLanguage]);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    
    // Try current locale
    let value = translations[locale];
    for (const k of keys) {
      if (value === undefined || value === null) break;
      value = value[k];
    }
    
    if (typeof value === 'string') return value;

    // Fallback to ru
    value = translations['ru'];
    for (const k of keys) {
      if (value === undefined || value === null) break;
      value = value[k];
    }
    
    return typeof value === 'string' ? value : key;
  }, [locale]);

  const value = useMemo(() => ({ t, locale, setLocale }), [t, locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
