const FRACTION_DIGITS: Record<string, number> = {
  CLP: 0,
  USD: 2,
  VES: 2,
};

const LOCALE_BY_CURRENCY: Record<string, string> = {
  CLP: "es-CL",
  VES: "es-VE",
  USD: "en-US",
};

export function formatMoney(amountMinor: number, currency: string) {
  const digits = FRACTION_DIGITS[currency] ?? 2;
  const locale = LOCALE_BY_CURRENCY[currency] ?? "es-CL";
  const value = amountMinor / 10 ** digits;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
