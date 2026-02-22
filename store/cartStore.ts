import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartStore } from "../types/types";

// the store itself does not need any change
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (productId: string, quantity: number = 1) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.id === productId,
          );
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === productId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            };
          }
          return {
            items: [...state.items, { id: productId, quantity }],
          };
        });
      },
      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },
      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === productId ? { ...item, quantity } : item,
          ),
        }));
      },
      clearCart: () => {
        set({ items: [] });
      },
    }),
    {
      name: "cart-storage",
    },
  ),
);
