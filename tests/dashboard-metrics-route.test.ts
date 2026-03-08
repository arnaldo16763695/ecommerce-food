import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const orderFindManyMock = vi.fn();
const orderGroupByMock = vi.fn();
const orderItemFindManyMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    order: {
      findMany: orderFindManyMock,
      groupBy: orderGroupByMock,
    },
    orderItem: {
      findMany: orderItemFindManyMock,
    },
  },
}));

describe("admin dashboard metrics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);

    const mod = await import("../app/api/admin/dashboard/metrics/route");
    const res = await mod.GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when user is not admin", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "CUSTOMER" } });

    const mod = await import("../app/api/admin/dashboard/metrics/route");
    const res = await mod.GET();

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns aggregated dashboard metrics", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "ADMIN" } });

    const now = new Date("2026-03-08T12:00:00.000Z");
    const yesterday = new Date("2026-03-07T12:00:00.000Z");
    const fiveDaysAgo = new Date("2026-03-03T12:00:00.000Z");

    orderFindManyMock
      .mockResolvedValueOnce([
        {
          id: "o1",
          status: "COMPLETED",
          paymentStatus: "PAID",
          fulfillmentType: "PICKUP",
          totalCents: 2000,
          createdAt: now,
        },
        {
          id: "o2",
          status: "PREPARING",
          paymentStatus: "PAID",
          fulfillmentType: "DELIVERY",
          totalCents: 1000,
          createdAt: yesterday,
        },
        {
          id: "o3",
          status: "CONFIRMED",
          paymentStatus: "UNPAID",
          fulfillmentType: "PICKUP",
          totalCents: 999,
          createdAt: fiveDaysAgo,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "o10",
          orderNumber: 10,
          status: "PREPARING",
          paymentStatus: "PAID",
          customerName: "Ana",
          totalCents: 3000,
          createdAt: now,
        },
      ]);

    orderGroupByMock
      .mockResolvedValueOnce([
        { status: "PENDING", _count: { _all: 1 } },
        { status: "PREPARING", _count: { _all: 2 } },
        { status: "COMPLETED", _count: { _all: 3 } },
      ])
      .mockResolvedValueOnce([
        { fulfillmentType: "PICKUP", _count: { _all: 2 } },
        { fulfillmentType: "DELIVERY", _count: { _all: 1 } },
      ]);

    orderItemFindManyMock.mockResolvedValueOnce([
      { nameSnapshot: "Burger", quantity: 2, unitPriceCents: 1000 },
      { nameSnapshot: "Burger", quantity: 1, unitPriceCents: 1000 },
      { nameSnapshot: "Fries", quantity: 3, unitPriceCents: 500 },
    ]);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const mod = await import("../app/api/admin/dashboard/metrics/route");
    const res = await mod.GET();
    const body = (await res.json()) as {
      data: {
        summary: {
          paidRevenueToday: number;
          paidRevenue7: number;
          paidRevenue30: number;
          paidOrders30: number;
          avgTicket30: number;
          activeOrders: number;
        };
        topProducts: Array<{ name: string; quantity: number }>;
      };
    };

    expect(res.status).toBe(200);
    expect(body.data.summary.paidRevenueToday).toBe(2000);
    expect(body.data.summary.paidRevenue7).toBe(3000);
    expect(body.data.summary.paidRevenue30).toBe(3000);
    expect(body.data.summary.paidOrders30).toBe(2);
    expect(body.data.summary.avgTicket30).toBe(1500);
    expect(body.data.summary.activeOrders).toBe(3);
    expect(body.data.topProducts[0]).toEqual(
      expect.objectContaining({ name: "Burger", quantity: 3 }),
    );

    vi.useRealTimers();
  });
});
