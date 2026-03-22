import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findManyMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    order: {
      findMany: findManyMock,
    },
  },
}));

describe("public orders route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for unauthenticated lookup without order/contact", async () => {
    authMock.mockResolvedValueOnce(null);

    const mod = await import("../app/api/orders/route");
    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await mod.POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Debes indicar numero de pedido y un contacto (email o telefono).",
    });
  });

  it("looks up by order number + contact for unauthenticated user", async () => {
    authMock.mockResolvedValueOnce(null);
    findManyMock.mockResolvedValueOnce([
      {
        id: "o1",
        orderNumber: 1001,
        status: "PENDING",
        paymentStatus: "UNPAID",
        fulfillmentType: "PICKUP",
        customerName: "Cliente",
        customerPhone: null,
        customerEmail: "mail@example.com",
        notes: null,
        subtotalCents: 1000,
        discountCents: 0,
        deliveryFeeCents: 0,
        taxCents: 100,
        totalCents: 1100,
        createdAt: new Date("2026-03-07T12:00:00.000Z"),
        address: null,
        items: [],
      },
    ]);

    const mod = await import("../app/api/orders/route");
    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: 1001, contact: "+58 412-555" }),
    });
    const res = await mod.POST(req);
    const body = (await res.json()) as { data: Array<{ orderNumber: number }> };

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          orderNumber: 1001,
          OR: [
            { customerEmail: "+58 412-555" },
            { customerPhone: "+58 412-555" },
            { customerPhone: "+58412555" },
          ],
        },
        take: 10,
      }),
    );
    expect(body.data[0].orderNumber).toBe(1001);
  });

  it("loads recent orders for authenticated user session", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findManyMock.mockResolvedValueOnce([]);

    const mod = await import("../app/api/orders/route");
    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await mod.POST(req);

    expect(res.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1" },
        take: 20,
      }),
    );
  });
});
