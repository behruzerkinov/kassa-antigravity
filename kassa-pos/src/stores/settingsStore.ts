import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

interface SettingsState {
  language: string;
  autoPrint: boolean;
  lockTime: number;
  printerName: string;
  setLanguage: (lang: string) => void;
  setAutoPrint: (auto: boolean) => void;
  setLockTime: (time: number) => void;
  setPrinterName: (name: string) => void;
}

const saveToDb = (key: string, value: string) => {
  invoke('update_setting', { key, value }).catch(() => {});
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ru',
      autoPrint: true,
      lockTime: 0,
      printerName: '',
      setLanguage: (lang) => { set({ language: lang }); saveToDb('language', lang); },
      setAutoPrint: (auto) => set({ autoPrint: auto }),
      setLockTime: (time) => set({ lockTime: time }),
      setPrinterName: (name) => { set({ printerName: name }); saveToDb('printer_name', name); },
    }),
    {
      name: 'kassa-settings'
    }
  )
);
