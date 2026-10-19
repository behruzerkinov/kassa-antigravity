import { create } from 'zustand';
import { invoke } from '../lib/desktop';
import type { SyncStatus } from '../lib/types';
import { useAuthStore } from './authStore';

const getToken = () => {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Нет активной сессии');
  return token;
};

interface SyncState {
  pendingCount: number;
  failedCount: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  lastSyncError: string | null;
  refresh: () => Promise<void>;
  retry: () => Promise<number>;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  failedCount: 0,
  lastSyncedAt: null,
  isSyncing: false,
  lastSyncError: null,

  refresh: async () => {
    if (!useAuthStore.getState().token) return;
    try {
      const status = await invoke<SyncStatus>('get_sync_status');
      set({
        pendingCount: status.pending_count,
        failedCount: status.failed_count,
        lastSyncedAt: status.last_synced_at,
      });
    } catch {
      // Status is informational; keep the last known value.
    }
  },

  retry: async () => {
    set({ isSyncing: true, lastSyncError: null });
    try {
      const count = await invoke<number>('retry_failed_sync');
      const status = await invoke<SyncStatus>('get_sync_status');
      set({
        pendingCount: status.pending_count,
        failedCount: status.failed_count,
        lastSyncedAt: status.last_synced_at,
        isSyncing: false,
      });
      return count;
    } catch (error) {
      set({ isSyncing: false, lastSyncError: String(error) });
      throw error;
    }
  },
}));

export { getToken as getSyncToken };
