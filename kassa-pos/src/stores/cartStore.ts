import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from './authStore';

export interface CartItem {
  id: number;
  product_id: number;
  barcode: string;
  name: string;
  price: number;
  qty: number;
  discount_type: string | null;
  discount_val: number | null;
  total: number;
}

export interface CartWithItems {
  id: number;
  name: string;
  items: CartItem[];
  total: number;
  discount_type: string | null;
  discount_val: number | null;
}

interface CartState {
  carts: CartWithItems[];
  activeCartIndex: number;
  activeCart: CartWithItems | null;
  createCart: () => Promise<void>;
  addToCart: (barcode: string) => Promise<void>;
  addProductById: (productId: number, qty: number) => Promise<void>;
  updateItemQty: (itemId: number, qty: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  parkCart: (name: string) => Promise<void>;
  resumeCart: (cartId: number) => Promise<void>;
  setActiveTab: (index: number) => void;
  applyItemDiscount: (itemId: number, type: string, value: number) => Promise<void>;
  applyCartDiscount: (type: string, value: number) => Promise<void>;
  refreshCarts: () => Promise<void>;
}

interface RawCartItem {
  id: number;
  product_id: number;
  barcode: string;
  name: string;
  price: number;
  qty: number;
  discount_type: string | null;
  discount_value: number | null;
  final_price: number;
}

interface RawCartWithItems {
  cart: { id: number; name: string | null };
  items: RawCartItem[];
  total: number;
}

const toCartWithItems = ({ cart, items, total }: RawCartWithItems): CartWithItems => ({
  id: cart.id,
  name: cart.name ?? '',
  items: items.map(({ discount_value, final_price, ...item }) => ({
    ...item,
    discount_val: discount_value,
    total: final_price,
  })),
  total,
  discount_type: null,
  discount_val: null,
});

const getToken = () => {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('Not authenticated');
  return token;
};

export const useCartStore = create<CartState>((set, get) => ({
  carts: [],
  activeCartIndex: 0,
  activeCart: null,

  createCart: async () => {
    await invoke('create_cart', { token: getToken() });
    await get().refreshCarts();
  },
  addToCart: async (barcode) => {
    const activeCart = get().activeCart;
    if (!activeCart) return;
    await invoke('add_to_cart', { token: getToken(), cartId: activeCart.id, barcode });
    await get().refreshCarts();
  },
  addProductById: async (productId, qty) => {
    if (!get().activeCart) await get().createCart();
    const activeCart = get().activeCart;
    if (!activeCart) return;
    await invoke('add_product_to_cart', { token: getToken(), cartId: activeCart.id, productId, qty });
    await get().refreshCarts();
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
    await invoke('clear_cart', { token: getToken(), cartId: activeCart.id });
    await get().refreshCarts();
  },
  parkCart: async (name) => {
    const activeCart = get().activeCart;
    if (!activeCart) return;
    await invoke('park_cart', { token: getToken(), cartId: activeCart.id, name });
    await get().refreshCarts();
  },
  resumeCart: async (cartId) => {
    await invoke('resume_cart', { token: getToken(), cartId });
    await get().refreshCarts();
  },
  setActiveTab: (index) => {
    const carts = get().carts;
    set({
      activeCartIndex: index,
      activeCart: carts[index] || null
    });
  },
  applyItemDiscount: async (itemId, type, value) => {
    await invoke('apply_item_discount', { token: getToken(), itemId, discountType: type, value });
    await get().refreshCarts();
  },
  applyCartDiscount: async (type, value) => {
    const activeCart = get().activeCart;
    if (!activeCart) return;
    await invoke('apply_cart_discount', { token: getToken(), cartId: activeCart.id, discountType: type, value });
    await get().refreshCarts();
  },
  refreshCarts: async () => {
    const raw = await invoke<RawCartWithItems[]>('get_active_carts', { token: getToken() });
    const carts = raw.map(toCartWithItems);
    let activeIndex = get().activeCartIndex;
    if (activeIndex >= carts.length) activeIndex = Math.max(0, carts.length - 1);
    
    set({
      carts,
      activeCartIndex: activeIndex,
      activeCart: carts[activeIndex] || null
    });
  }
}));
