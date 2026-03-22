import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CartStore,
  type AddCartItemInput,
  type CartItem,
  type UpdateCartItemConfigurationInput,
} from "../types/types";

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

function normalizeCartItemInput(
  input: string | AddCartItemInput,
  quantityArg?: number,
): CartItem {
  if (typeof input === "string") {
    const quantity = Math.max(1, Math.floor(quantityArg ?? 1));
    return {
      id: input,
      productId: input,
      quantity,
    };
  }

  const quantity = Math.max(1, Math.floor(input.quantity ?? quantityArg ?? 1));
  const lineKey = input.lineKey?.trim() || input.productId;

  return {
    id: lineKey,
    productId: input.productId,
    productVariantId: input.productVariantId,
    variantName: input.variantName,
    name: undefined,
    quantity,
    unitPriceCents: input.unitPriceCents,
    notes: input.notes?.trim() || undefined,
    options: input.options ?? [],
  };
}

function normalizeHydratedItems(items: CartItem[] | undefined): CartItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const productId = item.productId ?? item.id;
      const lineKey = item.id || productId;
      const quantity = Math.max(1, Math.floor(item.quantity || 1));

      return {
        ...item,
        id: lineKey,
        productId,
        quantity,
      };
    })
    .filter((item) => Boolean(item.id) && Boolean(item.productId));
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isHydratedFromServer: false,
      addItem: (input: string | AddCartItemInput, quantityArg?: number) => {
        const nextItem = normalizeCartItemInput(input, quantityArg);

        set((state) => {
          const existingItem = state.items.find((item) => item.id === nextItem.id);

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === nextItem.id
                  ? { ...item, quantity: item.quantity + nextItem.quantity }
                  : item,
              ),
            };
          }

          return {
            items: [...state.items, nextItem],
          };
        });

        scheduleSync(get().syncToServer);
      },
      removeItem: (lineKey: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== lineKey),
        }));

        scheduleSync(get().syncToServer);
      },
      updateQuantity: (lineKey: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(lineKey);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === lineKey ? { ...item, quantity } : item,
          ),
        }));

        scheduleSync(get().syncToServer);
      },
      updateItemConfiguration: (
        currentLineKey: string,
        input: UpdateCartItemConfigurationInput,
      ) => {
        set((state) => {
          const currentItem = state.items.find((item) => item.id === currentLineKey);
          if (!currentItem) return state;

          const nextLineKey = input.lineKey.trim();
          if (!nextLineKey) return state;

          const updatedItem: CartItem = {
            ...currentItem,
            id: nextLineKey,
            unitPriceCents: input.unitPriceCents,
            productVariantId: input.productVariantId ?? currentItem.productVariantId,
            variantName: input.variantName ?? currentItem.variantName,
            notes: input.notes?.trim() || undefined,
            options: input.options,
          };

          const withoutCurrent = state.items.filter(
            (item) => item.id !== currentLineKey,
          );
          const existingSameLine = withoutCurrent.find(
            (item) => item.id === nextLineKey,
          );

          if (existingSameLine) {
            return {
              items: withoutCurrent.map((item) =>
                item.id === nextLineKey
                  ? {
                      ...item,
                      quantity: item.quantity + currentItem.quantity,
                    }
                  : item,
              ),
            };
          }

          return {
            items: [...withoutCurrent, updatedItem],
          };
        });

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
            items: normalizeHydratedItems(data.items),
            isHydratedFromServer: true,
          });
        } catch {
          set({ isHydratedFromServer: true });
        }
      },
      syncToServer: async () => {
        if (typeof window === "undefined") return;

        try {
          const response = await fetch("/api/cart", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ items: get().items }),
          });

          if (!response.ok) {
            return;
          }

          const data = (await response.json()) as { items?: CartItem[] };

          set({
            items: normalizeHydratedItems(data.items),
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
