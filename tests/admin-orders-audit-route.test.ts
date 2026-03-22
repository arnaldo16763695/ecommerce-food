import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const orderFindUniqueMock = vi.fn();
const orderUpdateMock = vi.fn();
const orderUpdateManyMock = vi.fn();
const orderItemCountMock = vi.fn();
const orderPreparationItemCountMock = vi.fn();
const txProductFindManyMock = vi.fn();
const txProductUpdateMock = vi.fn();
const transactionMock = vi.fn();
const auditLogCreateMock = vi.fn();
const publishKitchenEventMock = vi.fn();
const canTransitionOrderStatusMock = vi.fn();
const canTransitionPaymentStatusMock = vi.fn();
const sendPaymentApprovedToCustomerMock = vi.fn();
const sendPaymentRejectedToCustomerMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/kitchen-events", () => ({
  publishKitchenEvent: publishKitchenEventMock,
}));

vi.mock("@/lib/order-workflow", () => ({
  canTransitionOrderStatus: canTransitionOrderStatusMock,
  canTransitionPaymentStatus: canTransitionPaymentStatusMock,
}));

vi.mock("@/lib/notifications/order-notifications", () => ({
  sendPaymentApprovedToCustomer: sendPaymentApprovedToCustomerMock,
  sendPaymentRejectedToCustomer: sendPaymentRejectedToCustomerMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    order: {
      findUnique: orderFindUniqueMock,
      update: orderUpdateMock,
      updateMany: orderUpdateManyMock,
    },
    orderItem: {
      count: orderItemCountMock,
    },
    orderPreparationItem: {
      count: orderPreparationItemCountMock,
    },
    auditLog: {
      create: auditLogCreateMock,
    },
    $transaction: transactionMock,
  },
}));

describe("admin orders audit integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canTransitionOrderStatusMock.mockReturnValue(true);
    canTransitionPaymentStatusMock.mockReturnValue(true);
    sendPaymentApprovedToCustomerMock.mockResolvedValue(undefined);
    sendPaymentRejectedToCustomerMock.mockResolvedValue(undefined);
    transactionMock.mockImplementation(async (input: unknown) => {
      if (typeof input === "function") {
        return input({
          product: {
            findMany: txProductFindManyMock,
            update: txProductUpdateMock,
          },
          order: {
            update: orderUpdateMock,
          },
        });
      }

      return Promise.all(input as Array<Promise<unknown>>);
    });
  });

  it("writes an audit log on admin order status and payment update", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    orderFindUniqueMock.mockResolvedValueOnce({
      id: "order_1",
      status: "READY",
      fulfillmentType: "DELIVERY",
      paymentStatus: "UNPAID",
      assignedPreparerId: "prep_1",
      items: [],
    });

    orderUpdateMock.mockResolvedValueOnce({
      id: "order_1",
      orderNumber: 42,
      status: "COMPLETED",
      paymentStatus: "PAID",
      fulfillmentType: "DELIVERY",
      customerName: "Ana",
      totalCents: 2500,
      createdAt: new Date("2026-03-16T10:00:00.000Z"),
      assignedPreparer: {
        id: "prep_1",
        name: "Luis",
        email: "luis@example.com",
      },
      _count: {
        items: 2,
      },
    });

    auditLogCreateMock.mockResolvedValueOnce({ id: "log_1" });

    const mod = await import("../app/api/admin/orders/[orderId]/route");
    const req = new Request("http://localhost/api/admin/orders/order_1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "vitest",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        status: "COMPLETED",
        paymentStatus: "PAID",
      }),
    });

    const res = await mod.PATCH(req as never, {
      params: Promise.resolve({ orderId: "order_1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("COMPLETED");
    expect(publishKitchenEventMock).toHaveBeenCalledWith({
      type: "ORDER_STATUS_CHANGED",
      orderId: "order_1",
      orderNumber: 42,
    });
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin_1",
        action: "STATUS_CHANGE",
        entityType: "ORDER",
        entityId: "order_1",
        entityLabel: "Pedido #42",
        summary: "Actualizo el pedido #42.",
        routePath: "/api/admin/orders/order_1",
        method: "PATCH",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        metadata: expect.objectContaining({
          orderNumber: 42,
          previousStatus: "READY",
          nextStatus: "COMPLETED",
          previousPaymentStatus: "UNPAID",
          nextPaymentStatus: "PAID",
          restoredStock: false,
        }),
      }),
    });
  });

  it("writes an audit log when admin approves a payment review", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    orderFindUniqueMock.mockResolvedValueOnce({
      id: "order_2",
      status: "PENDING",
      fulfillmentType: "PICKUP",
      paymentStatus: "UNPAID",
      paymentReviewStatus: "PENDING",
      paymentMethod: "MOBILE_PAYMENT",
      paymentProofUrl: "https://example.com/proof.png",
      customerName: "Jose",
      customerEmail: "jose@example.com",
      assignedPreparerId: null,
      items: [],
    });

    orderUpdateMock.mockResolvedValueOnce({
      id: "order_2",
      orderNumber: 84,
      status: "PENDING",
      paymentStatus: "PAID",
      paymentReviewStatus: "APPROVED",
      paymentMethod: "MOBILE_PAYMENT",
      fulfillmentType: "PICKUP",
      customerName: "Jose",
      totalCents: 3200,
      createdAt: new Date("2026-03-17T10:00:00.000Z"),
      assignedPreparer: null,
      _count: {
        items: 1,
      },
    });

    auditLogCreateMock.mockResolvedValueOnce({ id: "log_2" });

    const mod = await import("../app/api/admin/orders/[orderId]/route");
    const req = new Request("http://localhost/api/admin/orders/order_2", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "vitest",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        action: "APPROVE_PAYMENT",
        reviewNote: "Comprobante validado manualmente.",
      }),
    });

    const res = await mod.PATCH(req as never, {
      params: Promise.resolve({ orderId: "order_2" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.paymentStatus).toBe("PAID");
    expect(orderUpdateMock).toHaveBeenCalledWith({
      where: { id: "order_2" },
      data: expect.objectContaining({
        paymentStatus: "PAID",
        paymentReviewStatus: "APPROVED",
        paymentReviewNotes: "Comprobante validado manualmente.",
        paymentReviewedByUserId: "admin_1",
        paymentReviewedAt: expect.any(Date),
      }),
      select: expect.any(Object),
    });
    expect(sendPaymentApprovedToCustomerMock).toHaveBeenCalledWith({
      orderNumber: 84,
      customerName: "Jose",
      customerEmail: "jose@example.com",
      reviewNote: "Comprobante validado manualmente.",
    });
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin_1",
        action: "PAYMENT_REVIEW_APPROVE",
        entityType: "ORDER",
        entityId: "order_2",
        entityLabel: "Pedido #84",
        summary: "Aprobo manualmente el pago del pedido #84.",
        metadata: {
          orderNumber: 84,
          previousPaymentStatus: "UNPAID",
          nextPaymentStatus: "PAID",
          previousPaymentReviewStatus: "PENDING",
          nextPaymentReviewStatus: "APPROVED",
          reviewNote: "Comprobante validado manualmente.",
        },
      }),
    });
  });

  it("writes an audit log when admin rejects a payment review", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    orderFindUniqueMock.mockResolvedValueOnce({
      id: "order_3",
      status: "PENDING",
      fulfillmentType: "DELIVERY",
      paymentStatus: "UNPAID",
      paymentReviewStatus: "PENDING",
      paymentMethod: "BANK_TRANSFER",
      paymentProofUrl: "https://example.com/proof-2.png",
      customerName: "Maria",
      customerEmail: "maria@example.com",
      assignedPreparerId: null,
      items: [],
    });

    orderUpdateMock.mockResolvedValueOnce({
      id: "order_3",
      orderNumber: 96,
      status: "PENDING",
      paymentStatus: "UNPAID",
      paymentReviewStatus: "REJECTED",
      paymentMethod: "BANK_TRANSFER",
      fulfillmentType: "DELIVERY",
      customerName: "Maria",
      totalCents: 4100,
      createdAt: new Date("2026-03-17T11:00:00.000Z"),
      assignedPreparer: null,
      _count: {
        items: 2,
      },
    });

    auditLogCreateMock.mockResolvedValueOnce({ id: "log_3" });

    const mod = await import("../app/api/admin/orders/[orderId]/route");
    const req = new Request("http://localhost/api/admin/orders/order_3", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "vitest",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        action: "REJECT_PAYMENT_REVIEW",
        reviewNote: "La referencia no coincide con el monto recibido.",
      }),
    });

    const res = await mod.PATCH(req as never, {
      params: Promise.resolve({ orderId: "order_3" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.paymentReviewStatus).toBe("REJECTED");
    expect(orderUpdateMock).toHaveBeenCalledWith({
      where: { id: "order_3" },
      data: expect.objectContaining({
        paymentStatus: "UNPAID",
        paymentReviewStatus: "REJECTED",
        paymentReviewNotes: "La referencia no coincide con el monto recibido.",
        paymentReviewedByUserId: "admin_1",
        paymentReviewedAt: expect.any(Date),
      }),
      select: expect.any(Object),
    });
    expect(sendPaymentRejectedToCustomerMock).toHaveBeenCalledWith({
      orderNumber: 96,
      customerName: "Maria",
      customerEmail: "maria@example.com",
      reviewNote: "La referencia no coincide con el monto recibido.",
    });
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin_1",
        action: "PAYMENT_REVIEW_REJECT",
        entityType: "ORDER",
        entityId: "order_3",
        entityLabel: "Pedido #96",
        summary: "Rechazo la revision de pago del pedido #96.",
        metadata: {
          orderNumber: 96,
          previousPaymentStatus: "UNPAID",
          nextPaymentStatus: "UNPAID",
          previousPaymentReviewStatus: "PENDING",
          nextPaymentReviewStatus: "REJECTED",
          reviewNote: "La referencia no coincide con el monto recibido.",
        },
      }),
    });
  });

  it("allows approving a payment review with reference only", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    orderFindUniqueMock.mockResolvedValueOnce({
      id: "order_4",
      status: "PENDING",
      fulfillmentType: "PICKUP",
      paymentStatus: "UNPAID",
      paymentReviewStatus: "PENDING",
      paymentMethod: "MOBILE_PAYMENT",
      paymentReference: "PM-7788",
      paymentProofUrl: null,
      customerName: "Laura",
      customerEmail: "laura@example.com",
      assignedPreparerId: null,
      items: [],
    });

    orderUpdateMock.mockResolvedValueOnce({
      id: "order_4",
      orderNumber: 97,
      status: "PENDING",
      paymentStatus: "PAID",
      paymentReviewStatus: "APPROVED",
      paymentMethod: "MOBILE_PAYMENT",
      paymentReference: "PM-7788",
      fulfillmentType: "PICKUP",
      customerName: "Laura",
      totalCents: 2900,
      createdAt: new Date("2026-03-17T12:00:00.000Z"),
      assignedPreparer: null,
      _count: {
        items: 1,
      },
    });

    auditLogCreateMock.mockResolvedValueOnce({ id: "log_4" });

    const mod = await import("../app/api/admin/orders/[orderId]/route");
    const req = new Request("http://localhost/api/admin/orders/order_4", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "vitest",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        action: "APPROVE_PAYMENT",
      }),
    });

    const res = await mod.PATCH(req as never, {
      params: Promise.resolve({ orderId: "order_4" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.paymentStatus).toBe("PAID");
    expect(sendPaymentApprovedToCustomerMock).toHaveBeenCalledWith({
      orderNumber: 97,
      customerName: "Laura",
      customerEmail: "laura@example.com",
      reviewNote: null,
    });
  });

  it("restores tracked product stock when an admin cancels an order", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    orderFindUniqueMock.mockResolvedValueOnce({
      id: "order_5",
      status: "CONFIRMED",
      fulfillmentType: "PICKUP",
      paymentStatus: "PAID",
      paymentReviewStatus: "APPROVED",
      paymentMethod: "MOBILE_PAYMENT",
      paymentReference: "PM-100",
      paymentProofUrl: "https://example.com/proof.png",
      customerName: "Pedro",
      customerEmail: "pedro@example.com",
      assignedPreparerId: null,
      items: [
        { productId: "prod_1", quantity: 2 },
        { productId: "prod_2", quantity: 1 },
      ],
    });
    txProductFindManyMock.mockResolvedValueOnce([{ id: "prod_1" }]);
    orderUpdateMock.mockResolvedValueOnce({
      id: "order_5",
      orderNumber: 105,
      status: "CANCELED",
      paymentStatus: "PAID",
      paymentReviewStatus: "APPROVED",
      paymentMethod: "MOBILE_PAYMENT",
      fulfillmentType: "PICKUP",
      customerName: "Pedro",
      totalCents: 5200,
      createdAt: new Date("2026-03-20T11:00:00.000Z"),
      assignedPreparer: null,
      _count: {
        items: 2,
      },
    });

    const mod = await import("../app/api/admin/orders/[orderId]/route");
    const req = new Request("http://localhost/api/admin/orders/order_5", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "vitest",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        status: "CANCELED",
      }),
    });

    const res = await mod.PATCH(req as never, {
      params: Promise.resolve({ orderId: "order_5" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe("CANCELED");
    expect(txProductFindManyMock).toHaveBeenCalledWith({
      where: {
        id: { in: ["prod_1", "prod_2"] },
        trackStock: true,
      },
      select: {
        id: true,
      },
    });
    expect(txProductUpdateMock).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: {
        stockQuantity: {
          increment: 2,
        },
      },
    });
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityId: "order_5",
        metadata: expect.objectContaining({
          previousStatus: "CONFIRMED",
          nextStatus: "CANCELED",
          restoredStock: true,
        }),
      }),
    });
  });
});
