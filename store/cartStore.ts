import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartStore, type CartItem } from "../types/types";

const SYNC_DEBOUNCE_MS = 400;
let syncTimeout: ReturnType<typeof setTimeout> | undefined;

function scheduleSync(sync: () => Promise<void>) {
  if (typeof window === "undefined") return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    void sync();
  }, SYNC_DEBOUNCE_MS);
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isHydratedFromServer: false,
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

        scheduleSync(get().syncToServer);
      },
      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));

        scheduleSync(get().syncToServer);
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

        scheduleSync(get().syncToServer);
      },
      clearCart: () => {
        set({ items: [] });

        scheduleSync(get().syncToServer);
      },
      hydrateFromServer: async () => {
        if (typeof window === "undefined") return;

        try {
          const response = await fetch("/api/cart", {
            method: "GET",
            cache: "no-store",
          });

          if (!response.ok) {
            set({ isHydratedFromServer: true });
            return;
          }

          const data = (await response.json()) as { items?: CartItem[] };

          set({
            items: data.items ?? [],
            isHydratedFromServer: true,
          });
        } catch {
          set({ isHydratedFromServer: true });
        }
      },
      syncToServer: async () => {
        if (typeof window === "undefined") return;

        try {
          await fetch("/api/cart", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ items: get().items }),
          });
        } catch {
          // Keep local cart if sync fails.
        }
      },
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({
        items: state.items,
      }),
    },
  ),
);
