import { describe, expect, it } from "vitest";

import { resolveProductImageSrc } from "../lib/product-image";

describe("resolveProductImageSrc", () => {
  it("returns fallback image when source is empty", () => {
    expect(resolveProductImageSrc(undefined)).toBe("/images/product-1.png");
    expect(resolveProductImageSrc("   ")).toBe("/images/product-1.png");
  });

  it("preserves absolute urls", () => {
    expect(resolveProductImageSrc("https://cdn.example.com/p.png")).toBe(
      "https://cdn.example.com/p.png",
    );
  });

  it("preserves root-relative urls", () => {
    expect(resolveProductImageSrc("/uploads/p.png")).toBe("/uploads/p.png");
  });

  it("normalizes local file names into /images path", () => {
    expect(resolveProductImageSrc("custom.png")).toBe("/images/custom.png");
    expect(resolveProductImageSrc("custom.png", "fallback.png")).toBe(
      "/images/custom.png",
    );
  });
});
