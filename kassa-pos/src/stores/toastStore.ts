import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastMessage[];
  show: (title: string, variant?: ToastVariant, description?: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (title, variant = 'default', description) =>
    set((s) => ({ toasts: [...s.toasts, { id: nextId++, title, description, variant }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (title: string, variant: ToastVariant = 'default', description?: string) =>
  useToastStore.getState().show(title, variant, description);
