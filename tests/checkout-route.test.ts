import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const cookiesMock = vi.fn();
const cartFindFirstMock = vi.fn();
const cartFindUniqueMock = vi.fn();
const productFindManyMock = vi.fn();
const optionFindManyMock = vi.fn();
const productOptionGroupFindManyMock = vi.fn();
const cartUpdateMock = vi.fn();
const orderCreateMock = vi.fn();
const transactionMock = vi.fn();
const validateCheckoutCartMock = vi.fn();
const getStoreSettingsMock = vi.fn();
const publishKitchenEventMock = vi.fn();
const sendNewOrderInternalAlertMock = vi.fn();
const sendOrderConfirmationToCustomerMock = vi.fn();

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
      findUnique: cartFindUniqueMock,
      update: cartUpdateMock,
    },
    product: {
      findMany: productFindManyMock,
    },
    option: {
      findMany: optionFindManyMock,
    },
    productOptionGroup: {
      findMany: productOptionGroupFindManyMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/checkout-validation", () => ({
  validateCheckoutCart: validateCheckoutCartMock,
}));

vi.mock("@/lib/data/store-settings", () => ({
  getStoreSettings: getStoreSettingsMock,
}));

vi.mock("@/lib/kitchen-events", () => ({
  publishKitchenEvent: publishKitchenEventMock,
}));

vi.mock("@/lib/notifications/order-notifications", () => ({
  sendNewOrderInternalAlert: sendNewOrderInternalAlertMock,
  sendOrderConfirmationToCustomer: sendOrderConfirmationToCustomerMock,
}));

describe("checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    validateCheckoutCartMock.mockReturnValue({ ok: true });
    getStoreSettingsMock.mockResolvedValue({
      deliveryFeeCents: 700,
      freeDeliveryMinCents: 10000,
      isStoreOpen: true,
      storeStatusMessage: "La tienda no esta aceptando pedidos en este momento.",
    });
    sendNewOrderInternalAlertMock.mockResolvedValue(undefined);
    sendOrderConfirmationToCustomerMock.mockResolvedValue(undefined);

    transactionMock.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          order: {
            create: orderCreateMock,
          },
          cart: {
            update: cartUpdateMock,
          },
        }),
    );
  });

  it("stores phase 1 payment method data on order creation", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1", role: "CUSTOMER" },
    });

    cartFindFirstMock.mockResolvedValue({ id: "cart_1" });
    cartFindUniqueMock.mockResolvedValue({
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          lineKey: "line_1",
          productId: "prod_1",
          quantity: 2,
          unitPriceCents: 2500,
          nameSnapshot: "Burger clasica",
          notes: null,
          options: [],
        },
      ],
    });
    productFindManyMock.mockResolvedValue([
      {
        id: "prod_1",
        basePriceCents: 2500,
      },
    ]);
    optionFindManyMock.mockResolvedValue([]);
    productOptionGroupFindManyMock.mockResolvedValue([]);
    orderCreateMock.mockResolvedValue({
      id: "order_1",
      orderNumber: 101,
      totalCents: 5500,
      fulfillmentType: "PICKUP",
      createdAt: new Date("2026-03-16T12:00:00.000Z"),
    });
    cartUpdateMock.mockResolvedValue({ id: "cart_1" });

    const mod = await import("../app/api/checkout/route");
    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName: "Ana Perez",
        customerPhone: "04141234567",
        fulfillmentType: "PICKUP",
        paymentMethod: "MOBILE_PAYMENT",
        paymentReference: "REF-123",
        paymentProofUrl: "https://cdn.example.com/checkout-proofs/proof.png",
        paymentProofPath: "checkout-proofs/proof.png",
      }),
    });

    const res = await mod.POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.orderNumber).toBe(101);
    expect(orderCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentMethod: "MOBILE_PAYMENT",
        paymentReference: "REF-123",
        paymentProofUrl: "https://cdn.example.com/checkout-proofs/proof.png",
        paymentProofPath: "checkout-proofs/proof.png",
        paymentStatus: "UNPAID",
      }),
      select: expect.any(Object),
    });
    expect(publishKitchenEventMock).toHaveBeenCalledWith({
      type: "ORDER_CREATED",
      orderId: "order_1",
      orderNumber: 101,
    });
  });

  it("stores bank transfer orders with payment review pending", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1", role: "CUSTOMER" },
    });

    cartFindFirstMock.mockResolvedValue({ id: "cart_1" });
    cartFindUniqueMock.mockResolvedValue({
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          lineKey: "line_1",
          productId: "prod_1",
          quantity: 1,
          unitPriceCents: 3000,
          nameSnapshot: "Combo lunch",
          notes: null,
          options: [],
        },
      ],
    });
    productFindManyMock.mockResolvedValue([
      {
        id: "prod_1",
        basePriceCents: 3000,
      },
    ]);
    optionFindManyMock.mockResolvedValue([]);
    productOptionGroupFindManyMock.mockResolvedValue([]);
    orderCreateMock.mockResolvedValue({
      id: "order_2",
      orderNumber: 102,
      totalCents: 3300,
      fulfillmentType: "PICKUP",
      createdAt: new Date("2026-03-16T13:00:00.000Z"),
    });
    cartUpdateMock.mockResolvedValue({ id: "cart_1" });

    const mod = await import("../app/api/checkout/route");
    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName: "Luis Perez",
        customerPhone: "04141230000",
        fulfillmentType: "PICKUP",
        paymentMethod: "BANK_TRANSFER",
        paymentReference: "TRF-456",
        paymentProofUrl: "https://cdn.example.com/checkout-proofs/transfer.png",
        paymentProofPath: "checkout-proofs/transfer.png",
      }),
    });

    const res = await mod.POST(req);

    expect(res.status).toBe(201);
    expect(orderCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentMethod: "BANK_TRANSFER",
        paymentReviewStatus: "PENDING",
        paymentReference: "TRF-456",
        paymentProofUrl: "https://cdn.example.com/checkout-proofs/transfer.png",
        paymentProofPath: "checkout-proofs/transfer.png",
      }),
      select: expect.any(Object),
    });
  });

  it("marks in-store payments as not requiring manual review", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1", role: "CUSTOMER" },
    });

    cartFindFirstMock.mockResolvedValue({ id: "cart_1" });
    cartFindUniqueMock.mockResolvedValue({
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          lineKey: "line_1",
          productId: "prod_1",
          quantity: 1,
          unitPriceCents: 1800,
          nameSnapshot: "Empanada",
          notes: null,
          options: [],
        },
      ],
    });
    productFindManyMock.mockResolvedValue([
      {
        id: "prod_1",
        basePriceCents: 1800,
      },
    ]);
    optionFindManyMock.mockResolvedValue([]);
    productOptionGroupFindManyMock.mockResolvedValue([]);
    orderCreateMock.mockResolvedValue({
      id: "order_3",
      orderNumber: 103,
      totalCents: 1980,
      fulfillmentType: "PICKUP",
      createdAt: new Date("2026-03-16T14:00:00.000Z"),
    });
    cartUpdateMock.mockResolvedValue({ id: "cart_1" });

    const mod = await import("../app/api/checkout/route");
    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName: "Carla Perez",
        customerPhone: "04140001111",
        fulfillmentType: "PICKUP",
        paymentMethod: "IN_STORE",
        paymentReference: "NO-DEBERIA-GUARDARSE",
        paymentProofUrl: "https://cdn.example.com/checkout-proofs/in-store.png",
        paymentProofPath: "checkout-proofs/in-store.png",
      }),
    });

    const res = await mod.POST(req);

    expect(res.status).toBe(201);
    expect(orderCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentMethod: "IN_STORE",
        paymentReviewStatus: "NOT_REQUIRED",
        paymentReference: null,
        paymentProofUrl: null,
        paymentProofPath: null,
      }),
      select: expect.any(Object),
    });
  });

  it("rejects mobile payment checkout when no reference or proof is provided", async () => {
    const mod = await import("../app/api/checkout/route");
    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName: "Pedro Perez",
        customerPhone: "04140002222",
        fulfillmentType: "PICKUP",
        paymentMethod: "MOBILE_PAYMENT",
      }),
    });

    const res = await mod.POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid payload.");
    expect(orderCreateMock).not.toHaveBeenCalled();
  });

  it("rejects bank transfer checkout when no reference or proof is provided", async () => {
    const mod = await import("../app/api/checkout/route");
    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName: "Julia Perez",
        customerPhone: "04140003333",
        fulfillmentType: "PICKUP",
        paymentMethod: "BANK_TRANSFER",
      }),
    });

    const res = await mod.POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid payload.");
    expect(orderCreateMock).not.toHaveBeenCalled();
  });

  it("blocks checkout when the store is closed", async () => {
    authMock.mockResolvedValue({
      user: { id: "user_1", role: "CUSTOMER" },
    });

    getStoreSettingsMock.mockResolvedValueOnce({
      deliveryFeeCents: 700,
      freeDeliveryMinCents: 10000,
      isStoreOpen: false,
      storeStatusMessage: "Hoy abriremos mas tarde de lo habitual.",
    });

    cartFindFirstMock.mockResolvedValue({ id: "cart_1" });
    cartFindUniqueMock.mockResolvedValue({
      id: "cart_1",
      userId: "user_1",
      items: [
        {
          lineKey: "line_1",
          productId: "prod_1",
          quantity: 1,
          unitPriceCents: 2200,
          nameSnapshot: "Wrap",
          notes: null,
          options: [],
        },
      ],
    });
    productFindManyMock.mockResolvedValue([
      {
        id: "prod_1",
        basePriceCents: 2200,
      },
    ]);
    optionFindManyMock.mockResolvedValue([]);
    productOptionGroupFindManyMock.mockResolvedValue([]);

    const mod = await import("../app/api/checkout/route");
    const req = new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerName: "Mario Perez",
        customerPhone: "04145556666",
        fulfillmentType: "PICKUP",
        paymentMethod: "IN_STORE",
      }),
    });

    const res = await mod.POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("Hoy abriremos mas tarde de lo habitual.");
    expect(orderCreateMock).not.toHaveBeenCalled();
  });
});
