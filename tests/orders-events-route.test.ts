import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findUniqueMock = vi.fn();
let kitchenListener: ((event: {
  type: "ORDER_CREATED" | "ORDER_STATUS_CHANGED" | "ORDER_ITEM_PREPARATION_CHANGED";
  orderId: string;
  at: string;
}) => void) | null = null;

const unsubscribeMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    order: {
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("@/lib/kitchen-events", () => ({
  subscribeKitchenEvents: (
    listener: (event: {
      type: "ORDER_CREATED" | "ORDER_STATUS_CHANGED" | "ORDER_ITEM_PREPARATION_CHANGED";
      orderId: string;
      at: string;
    }) => void,
  ) => {
    kitchenListener = listener;
    return unsubscribeMock;
  },
}));

describe("orders events route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kitchenListener = null;
  });

  it("returns 401 when user is not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);

    const mod = await import("../app/api/orders/events/route");
    const req = new Request("http://localhost/api/orders/events");
    const res = await mod.GET(req);

    expect(res.status).toBe(401);
    await expect(res.text()).resolves.toContain("Unauthorized");
  });

  it("streams connected event and customer order updates", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    findUniqueMock.mockResolvedValueOnce({
      id: "o1",
      userId: "u1",
      orderNumber: 1001,
      status: "PREPARING",
      paymentStatus: "UNPAID",
    });

    const mod = await import("../app/api/orders/events/route");
    const req = new Request("http://localhost/api/orders/events");
    const res = await mod.GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    const first = await reader.read();
    const firstChunk = decoder.decode(first.value);
    expect(firstChunk).toContain("event: connected");

    expect(kitchenListener).toBeTypeOf("function");
    kitchenListener?.({
      type: "ORDER_STATUS_CHANGED",
      orderId: "o1",
      at: "2026-03-08T12:10:00.000Z",
    });

    const second = await reader.read();
    const secondChunk = decoder.decode(second.value);
    expect(secondChunk).toContain("event: orders");
    expect(secondChunk).toContain("\"orderId\":\"o1\"");

    await reader.cancel();
  });
});
