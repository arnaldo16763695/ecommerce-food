import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const cookiesMock = vi.fn();
const cartFindFirstMock = vi.fn();
const productFindManyMock = vi.fn();
const optionFindManyMock = vi.fn();
const cartItemFindManyMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    cart: {
      findFirst: cartFindFirstMock,
    },
    product: {
      findMany: productFindManyMock,
    },
    option: {
      findMany: optionFindManyMock,
    },
    cartItem: {
      findMany: cartItemFindManyMock,
    },
    $transaction: transactionMock,
  },
}));

describe("cart route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue(null);
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "guest-token-1" }),
    });
    cartFindFirstMock.mockResolvedValue({
      id: "cart_1",
      guestToken: "guest-token-1",
    });
    optionFindManyMock.mockResolvedValue([]);
  });

  it("clamps tracked products to available stock during cart sync", async () => {
    const persistedItems: Array<{
      lineKey: string;
      productId: string;
      nameSnapshot: string;
      quantity: number;
      unitPriceCents: number;
      notes: string | null;
      options: Array<{
        optionId: string;
        groupNameSnapshot: string;
        optionNameSnapshot: string;
        priceDeltaCents: number;
      }>;
    }> = [];

    productFindManyMock.mockResolvedValue([
      {
        id: "prod_1",
        name: 'Hamburguesa de pollo',
        basePriceCents: 2500,
        trackStock: true,
        stockQuantity: 2,
        variants: [],
      },
    ]);

    transactionMock.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          cartItem: {
            deleteMany: vi.fn(async () => {
              persistedItems.length = 0;
            }),
            create: vi.fn(async ({ data }: { data: {
              lineKey: string;
              productId: string;
              quantity: number;
              unitPriceCents: number;
              nameSnapshot: string;
              notes?: string;
              options: {
                create: Array<{
                  optionId: string;
                  groupNameSnapshot: string;
                  optionNameSnapshot: string;
                  priceDeltaCents: number;
                }>;
              };
            } }) => {
              persistedItems.push({
                ...data,
                notes: data.notes ?? null,
                options: data.options.create,
              });
            }),
          },
        }),
    );

    cartItemFindManyMock.mockImplementation(async () => persistedItems);

    const mod = await import("../app/api/cart/route");
    const req = new Request("http://localhost/api/cart", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            lineKey: "line_1",
            productId: "prod_1",
            quantity: 5,
            options: [],
          },
        ],
      }),
    });

    const res = await mod.PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toEqual([
      expect.objectContaining({
        id: "line_1",
        productId: "prod_1",
        name: "Hamburguesa de pollo",
        quantity: 2,
      }),
    ]);
  });

  it("drops sold-out tracked products during cart sync", async () => {
    productFindManyMock.mockResolvedValue([
      {
        id: "prod_1",
        name: "Wrap",
        basePriceCents: 1800,
        trackStock: true,
        stockQuantity: 0,
        variants: [],
      },
    ]);

    transactionMock.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          cartItem: {
            deleteMany: vi.fn(),
            create: vi.fn(),
          },
        }),
    );

    cartItemFindManyMock.mockResolvedValue([]);

    const mod = await import("../app/api/cart/route");
    const req = new Request("http://localhost/api/cart", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            lineKey: "line_1",
            productId: "prod_1",
            quantity: 1,
            options: [],
          },
        ],
      }),
    });

    const res = await mod.PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items).toEqual([]);
  });
});
