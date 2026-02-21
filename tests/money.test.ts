import { describe, expect, it } from "vitest";

import { formatMoney } from "../lib/money";

describe("formatMoney", () => {
  it("formats CLP values without decimals", () => {
    expect(formatMoney(5000, "CLP")).toBe("$5.000");
  });

  it("formats USD values with two decimals", () => {
    expect(formatMoney(12345, "USD")).toBe("$123.45");
  });

  it("uses fallback digits and locale for unknown currencies", () => {
    expect(formatMoney(1234, "EUR")).toContain("12,34");
  });
});
