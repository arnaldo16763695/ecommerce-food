import { describe, expect, it } from "vitest";

import { buildCartLineKey } from "../lib/cart-line-key";

describe("buildCartLineKey", () => {
  it("uses sorted option ids to create deterministic keys", () => {
    const a = buildCartLineKey({
      productId: "p-1",
      optionIds: ["b", "a"],
    });
    const b = buildCartLineKey({
      productId: "p-1",
      optionIds: ["a", "b"],
    });

    expect(a).toBe("p-1::a|b::no-notes");
    expect(b).toBe(a);
  });

  it("normalizes notes and falls back to base when no options", () => {
    const key = buildCartLineKey({
      productId: "p-2",
      optionIds: [],
      notes: "  Sin Cebolla  ",
    });

    expect(key).toBe("p-2::base::sin cebolla");
  });
});
