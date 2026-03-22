import { describe, expect, it } from "vitest";

import { slugify } from "../lib/slug";

describe("slugify", () => {
  it("removes accents and lowercases", () => {
    expect(slugify("  Categoria Premium  ")).toBe("categoria-premium");
  });

  it("removes symbols and collapses spaces/dashes", () => {
    expect(slugify("Salsas!!! --- Extra   Queso")).toBe("salsas-extra-queso");
  });
});
