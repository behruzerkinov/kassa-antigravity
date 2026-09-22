import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface Smena {
  id: number;
  cashier_id: number;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
}

interface AuthState {
  token: string | null;
  cashierId: number | null;
  cashierName: string | null;
  isLocked: boolean;
  isAuthenticated: boolean;
  openSmena: Smena | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  lockScreen: () => Promise<void>;
  unlockScreen: (password: string) => Promise<void>;
  setSmena: (smena: Smena | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      cashierId: null,
      cashierName: null,
      isLocked: false,
      isAuthenticated: false,
      openSmena: null,
      
      login: async (username, password) => {
        try {
          const res = await invoke<any>('login', { username, password });
          set({
            token: res.token,
            cashierId: res.cashier_id,
            cashierName: res.cashier_name,
            isAuthenticated: true,
            isLocked: false,
            openSmena: res.open_smena || null
          });
        } catch (error) {
          throw error;
        }
      },
      logout: async () => {
        try {
          await invoke('logout');
        } catch (e) {
          console.error('Logout error', e);
        } finally {
          set({
            token: null,
            cashierId: null,
            cashierName: null,
            isAuthenticated: false,
            isLocked: false,
            openSmena: null
          });
        }
      },
      validateSession: async () => {
        const { token } = get();
        if (!token) return false;
        try {
          const isValid = await invoke<boolean>('validate_session', { token });
          if (!isValid) {
            get().logout();
          }
          return isValid;
        } catch (e) {
          get().logout();
          return false;
        }
      },
      lockScreen: async () => {
        set({ isLocked: true });
      },
      unlockScreen: async (password) => {
        try {
          await invoke('unlock_screen', { password });
          set({ isLocked: false });
        } catch (e) {
          throw e;
        }
      },
      setSmena: (smena) => set({ openSmena: smena })
    }),
    {
      name: 'kassa-auth',
      partialize: (state) => ({ token: state.token }), // only save token
    }
  )
);
