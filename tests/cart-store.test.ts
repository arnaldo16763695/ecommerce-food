import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type StoreModule = typeof import("../store/cartStore");

vi.mock("zustand/middleware", async () => {
  const actual = await vi.importActual<typeof import("zustand/middleware")>(
    "zustand/middleware",
  );

  return {
    ...actual,
    persist: ((initializer: unknown) => initializer) as typeof actual.persist,
  };
});

async function loadStore() {
  const mod = (await import("../store/cartStore")) as StoreModule;
  return mod.useCartStore;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", {});
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("cartStore", () => {
  it("adds a product and increments quantity when repeated", async () => {
    const useCartStore = await loadStore();

    useCartStore.getState().addItem("product-1", 1);
    useCartStore.getState().addItem("product-1", 2);

    expect(useCartStore.getState().items).toEqual([
      { id: "product-1", productId: "product-1", quantity: 3 },
    ]);
  });

  it("removes an item when quantity is updated to zero", async () => {
    const useCartStore = await loadStore();

    useCartStore.getState().addItem("product-1", 2);
    useCartStore.getState().updateQuantity("product-1", 0);

    expect(useCartStore.getState().items).toEqual([]);
  });

  it("hydrates items from the server", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ id: "product-2", quantity: 4 }] }),
    } as Response);

    const useCartStore = await loadStore();
    await useCartStore.getState().hydrateFromServer();

    expect(useCartStore.getState().items).toEqual([
      { id: "product-2", productId: "product-2", quantity: 4 },
    ]);
    expect(useCartStore.getState().isHydratedFromServer).toBe(true);
  });

  it("marks store as hydrated on failed hydrate request", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    const useCartStore = await loadStore();
    await useCartStore.getState().hydrateFromServer();

    expect(useCartStore.getState().isHydratedFromServer).toBe(true);
  });

  it("debounces sync requests and sends latest items payload", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);

    const useCartStore = await loadStore();

    useCartStore.getState().addItem("product-1", 1);
    useCartStore.getState().addItem("product-1", 1);

    vi.advanceTimersByTime(399);
    expect(fetchMock).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(1);
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cart",
      expect.objectContaining({
        method: "PUT",
      }),
    );

    const payload = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as { body?: string })?.body),
    ) as {
      items: Array<{ id: string; quantity: number }>;
    };

    expect(payload.items).toEqual([
      { id: "product-1", productId: "product-1", quantity: 2 },
    ]);
  });

  it("updates item configuration and merges quantities on same resulting line", async () => {
    const useCartStore = await loadStore();

    useCartStore.getState().addItem({
      productId: "product-1",
      lineKey: "product-1::base::no-notes",
      quantity: 1,
      unitPriceCents: 1000,
    });
    useCartStore.getState().addItem({
      productId: "product-1",
      lineKey: "product-1::with-cheese::no-notes",
      quantity: 2,
      unitPriceCents: 1200,
    });

    useCartStore.getState().updateItemConfiguration("product-1::base::no-notes", {
      lineKey: "product-1::with-cheese::no-notes",
      unitPriceCents: 1200,
      options: [
        {
          optionId: "opt-cheese",
          groupName: "Extras",
          optionName: "Cheese",
          priceDeltaCents: 200,
        },
      ],
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toMatchObject({
      id: "product-1::with-cheese::no-notes",
      quantity: 3,
    });
  });
});
