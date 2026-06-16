import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product_id: string;
  product_name: string;
  slug: string;
  vendor_code: string | null;
  price: number;
  picture: string | null;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.product_id === item.product_id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.product_id === item.product_id ? { ...i, quantity: i.quantity + qty } : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: qty }] };
        }),
      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.product_id !== productId) })),
      setQty: (productId, qty) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.product_id === productId ? { ...i, quantity: Math.max(1, qty) } : i,
          ),
        })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "avtokluch-cart" },
  ),
);

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n) + " ₽";
