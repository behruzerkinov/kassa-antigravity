import { create } from 'zustand';
import { invoke } from '../lib/desktop';
import type { Cart, CartItem, CartWithItems } from '../lib/types';
import { useAuthStore } from './authStore';

export type { CartItem, CartWithItems } from '../lib/types';

interface CartState {
  carts: CartWithItems[];
  parkedCarts: Cart[];
  activeCartIndex: number;
  activeCart: CartWithItems | null;
  createCart: () => Promise<Cart>;
  addToCart: (barcode: string) => Promise<CartItem>;
  updateItemQty: (itemId: number, qty: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  parkCart: (name: string) => Promise<void>;
  resumeCart: (cartId: number) => Promise<void>;
  setActiveTab: (index: number) => void;
  applyItemDiscount: (itemId: number, type: string | null, value: number) => Promise<void>;
  applyCartDiscount: (type: string | null, value: number) => Promise<void>;
  refreshCarts: (selectId?: number) => Promise<void>;
  refreshParkedCarts: () => Promise<void>;
}

const getToken = () => {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Нет активной сессии');
  return token;
};

export const useCartStore = create<CartState>((set, get) => ({
  carts: [],
  parkedCarts: [],
  activeCartIndex: 0,
  activeCart: null,

  createCart: async () => {
    const cart = await invoke<Cart>('create_cart', { token: getToken() });
    await get().refreshCarts(cart.id);
    return cart;
  },

  addToCart: async (barcode) => {
    const activeCart = get().activeCart;
    if (!activeCart) throw new Error('Нет активного чека');
    const item = await invoke<CartItem>('add_to_cart', {
      token: getToken(),
      cartId: activeCart.cart.id,
      barcode,
    });
    await get().refreshCarts();
    return item;
  },

  updateItemQty: async (itemId, qty) => {
    await invoke('update_cart_item_qty', { token: getToken(), itemId, qty });
    await get().refreshCarts();
  },

  removeItem: async (itemId) => {
    await invoke('remove_cart_item', { token: getToken(), itemId });
    await get().refreshCarts();
  },

  clearCart: async () => {
    const activeCart = get().activeCart;
    if (!activeCart) return;
    await invoke('clear_cart', { token: getToken(), cartId: activeCart.cart.id });
    await get().refreshCarts();
  },

  parkCart: async (name) => {
    const activeCart = get().activeCart;
    if (!activeCart) return;
    await invoke('park_cart', {
      token: getToken(),
      cartId: activeCart.cart.id,
      name,
    });
    await get().refreshCarts();
    await get().refreshParkedCarts();
  },

  resumeCart: async (cartId) => {
    await invoke('resume_cart', { token: getToken(), cartId });
    await get().refreshCarts(cartId);
    await get().refreshParkedCarts();
  },

  setActiveTab: (index) => {
    const carts = get().carts;
    set({
      activeCartIndex: index,
      activeCart: carts[index] ?? null,
    });
  },

  applyItemDiscount: async (itemId, type, value) => {
    await invoke('apply_item_discount', {
      token: getToken(),
      itemId,
      discountType: type,
      value,
    });
    await get().refreshCarts();
  },

  applyCartDiscount: async (type, value) => {
    const activeCart = get().activeCart;
    if (!activeCart) return;
    await invoke('apply_cart_discount', {
      token: getToken(),
      cartId: activeCart.cart.id,
      discountType: type,
      value,
    });
    await get().refreshCarts();
  },

  refreshCarts: async (selectId) => {
    const carts = await invoke<CartWithItems[]>('get_active_carts', { token: getToken() });
    const currentId = get().activeCart?.cart.id ?? null;
    let activeIndex = get().activeCartIndex;

    if (selectId != null) {
      const found = carts.findIndex((c) => c.cart.id === selectId);
      if (found >= 0) activeIndex = found;
    } else if (currentId != null) {
      const found = carts.findIndex((c) => c.cart.id === currentId);
      if (found >= 0) activeIndex = found;
    }

    if (activeIndex >= carts.length) activeIndex = Math.max(0, carts.length - 1);
    if (activeIndex < 0) activeIndex = 0;

    set({
      carts,
      activeCartIndex: activeIndex,
      activeCart: carts[activeIndex] ?? null,
    });
  },

  refreshParkedCarts: async () => {
    const parkedCarts = await invoke<Cart[]>('get_parked_carts', { token: getToken() });
    set({ parkedCarts });
  },
}));
