export function formatCentsToMajorUnit(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function parseMajorUnitToCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) return null;

  return Math.round(numericValue * 100);
}

export function formatCurrencyFromCents(
  cents: number,
  currency: "USD" | "VES",
  locale = "es-VE",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function convertUsdCentsToVesCents(
  usdCents: number,
  usdToVesRate: number,
): number {
  return Math.round((usdCents / 100) * usdToVesRate * 100);
}
