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
const getDeliverySettingsMock = vi.fn();
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
  getDeliverySettings: getDeliverySettingsMock,
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
    getDeliverySettingsMock.mockResolvedValue({
      deliveryFeeCents: 700,
      freeDeliveryMinCents: 10000,
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
});
