import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSettingsStore } from '../stores/settingsStore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INTL_LOCALES: Record<string, string> = {
  'ru': 'ru-RU',
  'uz-Cyrl': 'uz-Cyrl-UZ',
  'uz-Latn': 'uz-Latn-UZ',
};

export function intlLocale(): string {
  return INTL_LOCALES[useSettingsStore.getState().language] ?? 'ru-RU';
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat(intlLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(intlLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(intlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
}
