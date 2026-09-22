import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  language: string;
  autoPrint: boolean;
  lockTime: number;
  setLanguage: (lang: string) => void;
  setAutoPrint: (auto: boolean) => void;
  setLockTime: (time: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ru',
      autoPrint: true,
      lockTime: 0,
      setLanguage: (lang) => set({ language: lang }),
      setAutoPrint: (auto) => set({ autoPrint: auto }),
      setLockTime: (time) => set({ lockTime: time })
    }),
    {
      name: 'kassa-settings'
    }
  )
);
