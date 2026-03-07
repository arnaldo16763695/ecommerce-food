import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findManyMock = vi.fn();
const updateManyMock = vi.fn();
const createMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    exchangeRate: {
      findMany: findManyMock,
    },
    $transaction: transactionMock,
  },
}));

describe("admin exchange-rates route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 on GET when user is not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);

    const mod = await import("../app/api/admin/exchange-rates/route");
    const res = await mod.GET();

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 403 on GET when user is not admin", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "CUSTOMER" } });

    const mod = await import("../app/api/admin/exchange-rates/route");
    const res = await mod.GET();

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns normalized rates on GET", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "ADMIN" } });
    findManyMock.mockResolvedValueOnce([
      {
        id: "r1",
        baseCurrency: "USD",
        quoteCurrency: "VES",
        rate: "89.500000",
        source: "BCV",
        isActive: true,
        effectiveAt: new Date("2026-03-07T12:00:00.000Z"),
        updatedAt: new Date("2026-03-07T12:00:00.000Z"),
      },
    ]);

    const mod = await import("../app/api/admin/exchange-rates/route");
    const res = await mod.GET();
    const body = (await res.json()) as { data: Array<{ rate: number }> };

    expect(res.status).toBe(200);
    expect(body.data[0].rate).toBe(89.5);
  });

  it("creates a new active rate on POST", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "ADMIN" } });

    transactionMock.mockImplementationOnce(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          exchangeRate: {
            updateMany: updateManyMock.mockResolvedValue({ count: 1 }),
            create: createMock.mockResolvedValue({
              id: "r2",
              baseCurrency: "USD",
              quoteCurrency: "VES",
              rate: "90.120000",
              source: "BCV",
              isActive: true,
              effectiveAt: new Date("2026-03-07T15:00:00.000Z"),
              updatedAt: new Date("2026-03-07T15:00:00.000Z"),
            }),
          },
        };

        return callback(tx);
      },
    );

    const mod = await import("../app/api/admin/exchange-rates/route");
    const req = new Request("http://localhost/api/admin/exchange-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rate: 90.12, source: "BCV" }),
    });
    const res = await mod.POST(req as never);
    const body = (await res.json()) as { data: { rate: number } };

    expect(res.status).toBe(201);
    expect(updateManyMock).toHaveBeenCalledOnce();
    expect(createMock).toHaveBeenCalledOnce();
    expect(body.data.rate).toBe(90.12);
  });
});
