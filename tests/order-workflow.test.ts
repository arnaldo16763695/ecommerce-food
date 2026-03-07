import { describe, expect, it } from "vitest";
import {
  canTransitionOrderStatus,
  canTransitionPaymentStatus,
  getSelectableOrderStatuses,
} from "../lib/order-workflow";

describe("order workflow status transitions", () => {
  it("allows PENDING -> CONFIRMED and blocks PENDING -> READY", () => {
    expect(canTransitionOrderStatus("PENDING", "CONFIRMED", "PICKUP")).toBe(true);
    expect(canTransitionOrderStatus("PENDING", "READY", "PICKUP")).toBe(false);
  });

  it("enforces READY transitions by fulfillment type", () => {
    expect(canTransitionOrderStatus("READY", "COMPLETED", "PICKUP")).toBe(true);
    expect(canTransitionOrderStatus("READY", "OUT_FOR_DELIVERY", "PICKUP")).toBe(false);

    expect(canTransitionOrderStatus("READY", "OUT_FOR_DELIVERY", "DELIVERY")).toBe(
      true,
    );
    expect(canTransitionOrderStatus("READY", "COMPLETED", "DELIVERY")).toBe(false);
  });

  it("keeps terminal states blocked", () => {
    expect(canTransitionOrderStatus("COMPLETED", "PENDING", "PICKUP")).toBe(false);
    expect(canTransitionOrderStatus("CANCELED", "CONFIRMED", "DELIVERY")).toBe(false);
  });

  it("returns current + valid transitions for selector", () => {
    expect(getSelectableOrderStatuses("PREPARING", "PICKUP")).toEqual([
      "PREPARING",
      "READY",
      "CANCELED",
    ]);
  });
});

describe("payment workflow transitions", () => {
  it("allows UNPAID -> PAID and blocks UNPAID -> REFUNDED", () => {
    expect(canTransitionPaymentStatus("UNPAID", "PAID")).toBe(true);
    expect(canTransitionPaymentStatus("UNPAID", "REFUNDED")).toBe(false);
  });

  it("allows PAID -> REFUNDED and blocks REFUNDED -> PAID", () => {
    expect(canTransitionPaymentStatus("PAID", "REFUNDED")).toBe(true);
    expect(canTransitionPaymentStatus("REFUNDED", "PAID")).toBe(false);
  });
});
