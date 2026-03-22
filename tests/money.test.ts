import { describe, expect, it } from "vitest";
import {
  convertUsdCentsToVesCents,
  parseMajorUnitToCents,
} from "../lib/money";

describe("parseMajorUnitToCents", () => {
  it("parses decimal values with dot", () => {
    expect(parseMajorUnitToCents("10.30")).toBe(1030);
  });

  it("parses decimal values with comma", () => {
    expect(parseMajorUnitToCents("10,3")).toBe(1030);
  });

  it("returns null for invalid decimals", () => {
    expect(parseMajorUnitToCents("10.345")).toBeNull();
    expect(parseMajorUnitToCents("abc")).toBeNull();
    expect(parseMajorUnitToCents("")).toBeNull();
  });
});

describe("convertUsdCentsToVesCents", () => {
  it("converts cents using exchange rate", () => {
    expect(convertUsdCentsToVesCents(100, 89.5)).toBe(8950);
    expect(convertUsdCentsToVesCents(1030, 89.5)).toBe(92185);
  });
});
