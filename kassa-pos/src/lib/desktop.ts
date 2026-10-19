import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { demoInvoke } from './demo';

/**
 * The app is a Tauri desktop app, but the UI is also reviewed in a browser.
 * `isDesktop` tells chrome-level code (window controls, native printers) which
 * environment it is in; `invoke` transparently swaps in the demo backend.
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function invoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  if (isDesktop()) return tauriInvoke<T>(cmd, args);
  return demoInvoke<T>(cmd, args);
}

export function errorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return String(error);
}
