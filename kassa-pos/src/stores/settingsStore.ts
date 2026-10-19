import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'ru' | 'uz-Cyrl' | 'uz-Latn';

interface SettingsState {
  language: Locale;
  autoPrint: boolean;
  lockTime: number;
  printerName: string;
  printerWidth: 58 | 80;
  weightedPrefixes: string;
  autostart: boolean;
  theme: 'light' | 'dark';
  setLanguage: (lang: Locale) => void;
  setAutoPrint: (auto: boolean) => void;
  setLockTime: (time: number) => void;
  setPrinterName: (name: string) => void;
  setPrinterWidth: (width: 58 | 80) => void;
  setWeightedPrefixes: (prefixes: string) => void;
  setAutostart: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ru',
      autoPrint: true,
      lockTime: 5,
      printerName: 'XP-80C (USB)',
      printerWidth: 80,
      weightedPrefixes: '27,28,29',
      autostart: false,
      theme: 'light',
      setLanguage: (language) => set({ language }),
      setAutoPrint: (autoPrint) => set({ autoPrint }),
      setLockTime: (lockTime) => set({ lockTime }),
      setPrinterName: (printerName) => set({ printerName }),
      setPrinterWidth: (printerWidth) => set({ printerWidth }),
      setWeightedPrefixes: (weightedPrefixes) => set({ weightedPrefixes }),
      setAutostart: (autostart) => set({ autostart }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'kassa-settings' },
  ),
);
