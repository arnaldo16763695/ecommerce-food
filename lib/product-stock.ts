export function isProductSoldOut(input: {
  trackStock: boolean;
  stockQuantity: number;
}) {
  return input.trackStock && input.stockQuantity <= 0;
}

export function getAvailableStock(input: {
  trackStock: boolean;
  stockQuantity: number;
}) {
  if (!input.trackStock) return Number.POSITIVE_INFINITY;
  return Math.max(0, input.stockQuantity);
}
