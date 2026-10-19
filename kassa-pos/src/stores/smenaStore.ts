import { create } from 'zustand';
import { invoke } from '../lib/desktop';
import type { Expense, ExpenseType, Smena, XReport } from '../lib/types';
import { useAuthStore } from './authStore';

const getToken = () => {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Нет активной сессии');
  return token;
};

interface SmenaState {
  openSmena: () => Promise<Smena>;
  closeSmena: (smenaId: number, force?: boolean) => Promise<void>;
  getXReport: (smenaId: number) => Promise<XReport>;
  getExpenses: (smenaId: number) => Promise<Expense[]>;
  getExpenseTypes: () => Promise<ExpenseType[]>;
  addExpense: (expenseTypeId: number, amount: number, note: string | null) => Promise<Expense>;
}

export const useSmenaStore = create<SmenaState>(() => ({
  openSmena: async () => {
    const smena = await invoke<Smena>('open_smena', { token: getToken() });
    useAuthStore.getState().setSmena(smena);
    return smena;
  },

  closeSmena: async (smenaId, force) => {
    await invoke('close_smena', { token: getToken(), smenaId, force: Boolean(force) });
    useAuthStore.getState().setSmena(null);
  },

  getXReport: async (smenaId) =>
    invoke<XReport>('get_x_report', { token: getToken(), smenaId }),

  getExpenses: async (smenaId) =>
    invoke<Expense[]>('get_smena_expenses', { token: getToken(), smenaId }),

  getExpenseTypes: async () => invoke<ExpenseType[]>('get_expense_types'),

  addExpense: async (expenseTypeId, amount, note) =>
    invoke<Expense>('create_expense', {
      token: getToken(),
      expenseTypeId,
      amount,
      note,
    }),
}));
