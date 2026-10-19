import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '../lib/desktop';
import type { LoginResponse, SessionInfo, Smena } from '../lib/types';

interface AuthState {
  token: string | null;
  cashierId: number | null;
  cashierName: string | null;
  isLocked: boolean;
  isAuthenticated: boolean;
  openSmena: Smena | null;
  logoutConfirmOpen: boolean;
  setLogoutConfirmOpen: (open: boolean) => void;
  requestLogout: () => void;
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
      logoutConfirmOpen: false,

      setLogoutConfirmOpen: (logoutConfirmOpen) => set({ logoutConfirmOpen }),
      requestLogout: () => set({ logoutConfirmOpen: true }),

      login: async (username, password) => {
        const res = await invoke<LoginResponse>('login', { username, password });
        set({
          token: res.token,
          cashierId: res.cashier_id,
          cashierName: res.cashier_name,
          isAuthenticated: true,
          isLocked: false,
          openSmena: res.open_smena ?? null,
        });
      },

      logout: async () => {
        const token = get().token;
        try {
          if (token) await invoke('logout', { token });
        } catch (error) {
          console.error('Logout error', error);
        } finally {
          set({
            token: null,
            cashierId: null,
            cashierName: null,
            isAuthenticated: false,
            isLocked: false,
            openSmena: null,
          });
        }
      },

      validateSession: async () => {
        const { token } = get();
        if (!token) return false;
        try {
          const session = await invoke<SessionInfo>('validate_session', { token });
          set({
            cashierId: session.cashier_id,
            cashierName: session.cashier_name,
            openSmena: session.open_smena ?? null,
            isAuthenticated: true,
            isLocked: session.is_locked ?? false,
          });
          return true;
        } catch {
          await get().logout();
          return false;
        }
      },

      lockScreen: async () => {
        const token = get().token;
        if (!token) return;
        await invoke('lock_screen', { token });
        set({ isLocked: true });
      },

      unlockScreen: async (password) => {
        const token = get().token;
        if (!token) throw new Error('Нет активной сессии');
        await invoke('unlock_screen', { token, password });
        set({ isLocked: false });
      },

      setSmena: (smena) => set({ openSmena: smena }),
    }),
    {
      name: 'kassa-auth',
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
