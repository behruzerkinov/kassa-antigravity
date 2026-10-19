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
  selectedItemId: number | null;
  setSelectedItemId: (id: number | null) => void;
  createCart: () => Promise<Cart>;
  addToCart: (barcode: string) => Promise<CartItem>;
  updateItemQty: (itemId: number, qty: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  closeCart: (cartId: number) => Promise<void>;
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
  selectedItemId: null,

  setSelectedItemId: (selectedItemId) => set({ selectedItemId }),

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
    set({ selectedItemId: item.id });
    await get().refreshCarts();
    return item;
  },

  updateItemQty: async (itemId, qty) => {
    set({ selectedItemId: itemId });
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

  closeCart: async (cartId: number) => {
    await invoke('close_cart', { token: getToken(), cartId });
    const remaining = get().carts.filter((c) => c.cart.id !== cartId);
    if (remaining.length === 0) {
      await get().createCart();
    } else {
      await get().refreshCarts();
    }
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
    const active = carts[index] ?? null;
    const selectedId = active?.items[active.items.length - 1]?.id ?? null;
    set({
      activeCartIndex: index,
      activeCart: active,
      selectedItemId: selectedId,
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

    const currentActive = carts[activeIndex] ?? null;
    let selectedId = get().selectedItemId;
    if (currentActive && currentActive.items.length > 0) {
      if (!selectedId || !currentActive.items.some((i) => i.id === selectedId)) {
        selectedId = currentActive.items[currentActive.items.length - 1].id;
      }
    } else {
      selectedId = null;
    }

    set({
      carts,
      activeCartIndex: activeIndex,
      activeCart: currentActive,
      selectedItemId: selectedId,
    });
  },

  refreshParkedCarts: async () => {
    const parkedCarts = await invoke<Cart[]>('get_parked_carts', { token: getToken() });
    set({ parkedCarts });
  },
}));
