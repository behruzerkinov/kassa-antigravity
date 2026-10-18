import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from './authStore';

const getToken = () => {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Not authenticated');
  return token;
};

const getSmenaId = () => {
  const smena = useAuthStore.getState().openSmena;
  if (!smena) throw new Error('No open smena');
  return smena.id;
};

interface SmenaState {
  openSmena: () => Promise<void>;
  closeSmena: () => Promise<void>;
  getXReport: () => Promise<any>;
}

export const useSmenaStore = create<SmenaState>((set) => ({
  openSmena: async () => {
    const res = await invoke<any>('open_smena', { token: getToken() });
    useAuthStore.getState().setSmena(res);
  },
  closeSmena: async () => {
    await invoke('close_smena', { token: getToken(), smenaId: getSmenaId() });
    useAuthStore.getState().setSmena(null);
  },
  getXReport: async () => {
    return await invoke('get_x_report', { token: getToken(), smenaId: getSmenaId() });
  }
}));
