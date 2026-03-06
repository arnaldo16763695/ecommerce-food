import { describe, expect, it } from "vitest";
import { validateCheckoutCart } from "../lib/checkout-validation";

describe("validateCheckoutCart", () => {
  const baseInput = {
    items: [
      {
        lineKey: "line-1",
        productId: "p1",
        unitPriceCents: 1200,
        quantity: 1,
        options: [{ optionId: "o1", quantity: 1 }],
      },
    ],
    products: [{ id: "p1", basePriceCents: 1000 }],
    options: [
      {
        id: "o1",
        groupId: "g1",
        priceDeltaCents: 200,
        isActive: true,
        groupIsActive: true,
      },
    ],
    productGroupRules: [
      {
        productId: "p1",
        groupId: "g1",
        minSelect: 1,
        maxSelect: 2,
        isActive: true,
      },
    ],
  };

  it("accepts valid selection and current price", () => {
    const result = validateCheckoutCart(baseInput);
    expect(result.ok).toBe(true);
  });

  it("rejects when required options are missing", () => {
    const result = validateCheckoutCart({
      ...baseInput,
      items: [{ ...baseInput.items[0], options: [] }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Faltan opciones requeridas");
    }
  });

  it("rejects when max selection is exceeded", () => {
    const result = validateCheckoutCart({
      ...baseInput,
      items: [
        {
          ...baseInput.items[0],
          options: [{ optionId: "o1", quantity: 3 }],
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("maximo");
    }
  });

  it("rejects when option no longer belongs to product group", () => {
    const result = validateCheckoutCart({
      ...baseInput,
      options: [
        {
          ...baseInput.options[0],
          groupId: "g2",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("ya no pertenece");
    }
  });

  it("rejects when unit price changed", () => {
    const result = validateCheckoutCart({
      ...baseInput,
      items: [{ ...baseInput.items[0], unitPriceCents: 1000 }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("precios cambiaron");
    }
  });
});
