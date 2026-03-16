import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const orderFindUniqueMock = vi.fn();
const orderUpdateMock = vi.fn();
const orderUpdateManyMock = vi.fn();
const orderItemCountMock = vi.fn();
const orderPreparationItemCountMock = vi.fn();
const transactionMock = vi.fn();
const auditLogCreateMock = vi.fn();
const publishKitchenEventMock = vi.fn();
const canTransitionOrderStatusMock = vi.fn();
const canTransitionPaymentStatusMock = vi.fn();

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
    transactionMock.mockImplementation(async (items: Array<Promise<unknown>>) =>
      Promise.all(items),
    );
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
        metadata: {
          orderNumber: 42,
          previousStatus: "READY",
          nextStatus: "COMPLETED",
          previousPaymentStatus: "UNPAID",
          nextPaymentStatus: "PAID",
        },
      }),
    });
  });
});
