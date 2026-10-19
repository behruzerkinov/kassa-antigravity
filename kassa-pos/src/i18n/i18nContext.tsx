import React, { createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import ru from './locales/ru.json';
import uzCyrl from './locales/uz-Cyrl.json';
import uzLatn from './locales/uz-Latn.json';
import { useSettingsStore, type Locale } from '../stores/settingsStore';

const translations: Record<Locale, unknown> = {
  ru,
  'uz-Cyrl': uzCyrl,
  'uz-Latn': uzLatn,
};

type Params = Record<string, string | number>;

interface I18nContextProps {
  t: (key: string, params?: Params) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

function lookup(dictionary: unknown, keys: string[]): unknown {
  let value: any = dictionary;
  for (const key of keys) {
    if (value === undefined || value === null) return undefined;
    value = value[key];
  }
  return value;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);

  useEffect(() => {
    document.documentElement.lang = locale === 'ru' ? 'ru' : locale === 'uz-Cyrl' ? 'uz-Cyrl' : 'uz';
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Params): string => {
      const keys = key.split('.');
      let value = lookup(translations[locale], keys);
      if (typeof value !== 'string') value = lookup(translations.ru, keys);
      if (typeof value !== 'string') return key;
      if (!params) return value;
      return value.replace(/\{(\w+)\}/g, (match, name: string) =>
        params[name] === undefined ? match : String(params[name]),
      );
    },
    [locale],
  );

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLanguage(newLocale);
    },
    [setLanguage],
  );

  const value = useMemo(() => ({ t, locale, setLocale }), [t, locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used within an I18nProvider');
  return context;
}
