import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from './authStore';

export const QUICK_SELL_MAX = 24;

export interface Product {
  id: number;
  barcode: string | null;
  code: string | null;
  name: string;
  price: number;
  cost_price: number | null;
  wholesale_price: number | null;
  stock_qty: number;
  unit: string;
  category: string | null;
  is_weighted: boolean;
  vat: number | null;
  expiry_date: string | null;
  is_custom: boolean;
  updated_at: string;
}

export interface ProductInput {
  category: string | null;
  name: string;
  barcode: string | null;
  code: string | null;
  unit: string | null;
  stock_qty: number;
  cost_price: number | null;
  wholesale_price: number | null;
  price: number;
  expiry_date: string | null;
  vat: number | null;
}

const token = () => useAuthStore.getState().token;

export const productApi = {
  list: (query: string, customOnly: boolean) => invoke<Product[]>('list_products', { query, customOnly }),
  search: (query: string) => invoke<Product[]>('search_products', { query }),
  findByCode: (code: string) => invoke<Product | null>('find_product_by_code', { code }),
  create: (input: ProductInput) => invoke<Product>('create_product', { token: token(), input }),
  update: (id: number, input: ProductInput) => invoke<Product>('update_product', { token: token(), id, input }),
  remove: (id: number) => invoke<void>('delete_product', { token: token(), id }),
};

interface ProductState {
  quickSell: Product[];
  /** Bumped after create/update/delete so lists re-query. */
  revision: number;
  loadQuickSell: () => Promise<void>;
  setQuickSell: (products: Product[]) => Promise<void>;
  bump: () => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  quickSell: [],
  revision: 0,
  loadQuickSell: async () => {
    set({ quickSell: await invoke<Product[]>('get_quick_sell') });
  },
  setQuickSell: async (products) => {
    const previous = get().quickSell;
    set({ quickSell: products });
    try {
      await invoke('set_quick_sell', { token: token(), productIds: products.map((p) => p.id) });
    } catch (e) {
      set({ quickSell: previous });
      throw e;
    }
  },
  bump: () => {
    set((s) => ({ revision: s.revision + 1 }));
    get().loadQuickSell().catch(() => {});
  },
}));
