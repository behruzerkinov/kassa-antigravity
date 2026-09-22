import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from './authStore';

const getToken = () => {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Not authenticated');
  return token;
};

interface SyncState {
  pendingCount: number;
  lastSyncError: string | null;
  isSyncing: boolean;
  setPendingCount: (count: number) => void;
  setSyncStatus: (isSyncing: boolean, error?: string | null) => void;
  triggerSync: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  lastSyncError: null,
  isSyncing: false,
  setPendingCount: (count) => set({ pendingCount: count }),
  setSyncStatus: (isSyncing, error = null) => set({ isSyncing, lastSyncError: error }),
  triggerSync: async () => {
    try {
      set({ isSyncing: true, lastSyncError: null });
      await invoke('trigger_sync', { token: getToken() });
      set({ isSyncing: false });
    } catch (e: any) {
      set({ isSyncing: false, lastSyncError: e.message || 'Error' });
    }
  }
}));
