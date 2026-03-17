export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELED";

export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";
export type PaymentReviewStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";
export type FulfillmentType = "PICKUP" | "DELIVERY";

export function getAllowedOrderStatusTransitions(
  current: OrderStatus,
  fulfillmentType: FulfillmentType,
): OrderStatus[] {
  switch (current) {
    case "PENDING":
      return ["CONFIRMED", "CANCELED"];
    case "CONFIRMED":
      return ["PREPARING", "CANCELED"];
    case "PREPARING":
      return ["READY", "CANCELED"];
    case "READY":
      return fulfillmentType === "DELIVERY"
        ? ["OUT_FOR_DELIVERY"]
        : ["COMPLETED"];
    case "OUT_FOR_DELIVERY":
      return ["COMPLETED"];
    case "COMPLETED":
    case "CANCELED":
      return [];
    default:
      return [];
  }
}

export function canTransitionOrderStatus(
  current: OrderStatus,
  next: OrderStatus,
  fulfillmentType: FulfillmentType,
): boolean {
  if (current === next) return true;
  return getAllowedOrderStatusTransitions(current, fulfillmentType).includes(next);
}

export function getSelectableOrderStatuses(
  current: OrderStatus,
  fulfillmentType: FulfillmentType,
): OrderStatus[] {
  return [current, ...getAllowedOrderStatusTransitions(current, fulfillmentType)];
}

export function getAllowedPaymentStatusTransitions(
  current: PaymentStatus,
): PaymentStatus[] {
  switch (current) {
    case "UNPAID":
      return ["PAID"];
    case "PAID":
      return ["REFUNDED"];
    case "REFUNDED":
      return [];
    default:
      return [];
  }
}

export function canTransitionPaymentStatus(
  current: PaymentStatus,
  next: PaymentStatus,
): boolean {
  if (current === next) return true;
  return getAllowedPaymentStatusTransitions(current).includes(next);
}

export function getSelectablePaymentStatuses(
  current: PaymentStatus,
): PaymentStatus[] {
  return [current, ...getAllowedPaymentStatusTransitions(current)];
}
