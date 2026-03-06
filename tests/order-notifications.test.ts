import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: sendMock,
      },
    })),
  };
});

describe("sendNewOrderInternalAlert", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("skips resend and logs payload when env vars are missing", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.ORDERS_ALERT_EMAIL;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const mod = await import("../lib/notifications/order-notifications");
    await mod.sendNewOrderInternalAlert({
      orderNumber: 1001,
      customerName: "Cliente",
      customerPhone: null,
      customerEmail: null,
      fulfillmentType: "PICKUP",
      totalCents: 4500,
      itemsCount: 2,
      createdAt: new Date("2026-03-06T10:00:00.000Z"),
    });

    expect(sendMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  it("sends email when resend env vars are configured", async () => {
    process.env.RESEND_API_KEY = "test_key";
    process.env.RESEND_FROM_EMAIL = "orders@example.com";
    process.env.ORDERS_ALERT_EMAIL = "ops@example.com";

    const mod = await import("../lib/notifications/order-notifications");
    await mod.sendNewOrderInternalAlert({
      orderNumber: 1002,
      customerName: "Cliente",
      customerPhone: "+580000",
      customerEmail: "mail@example.com",
      fulfillmentType: "DELIVERY",
      totalCents: 5000,
      itemsCount: 3,
      createdAt: new Date("2026-03-06T10:00:00.000Z"),
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "orders@example.com",
        to: "ops@example.com",
        subject: "Nuevo pedido #1002",
      }),
    );
  });
});

