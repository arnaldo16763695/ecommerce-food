type CheckoutCartOption = {
  optionId: string;
  quantity: number;
};

type CheckoutCartItem = {
  lineKey: string;
  productId: string;
  unitPriceCents: number;
  quantity: number;
  options: CheckoutCartOption[];
};

type CheckoutProduct = {
  id: string;
  basePriceCents: number;
};

type CheckoutOption = {
  id: string;
  groupId: string;
  priceDeltaCents: number;
  isActive: boolean;
  groupIsActive: boolean;
};

type ProductGroupRule = {
  productId: string;
  groupId: string;
  minSelect: number;
  maxSelect: number;
  isActive: boolean;
};

type ValidationInput = {
  items: CheckoutCartItem[];
  products: CheckoutProduct[];
  options: CheckoutOption[];
  productGroupRules: ProductGroupRule[];
};

export function validateCheckoutCart(input: ValidationInput) {
  const productById = new Map(input.products.map((product) => [product.id, product]));
  const optionById = new Map(input.options.map((option) => [option.id, option]));

  const rulesByProductId = new Map<string, ProductGroupRule[]>();
  for (const rule of input.productGroupRules) {
    const existing = rulesByProductId.get(rule.productId);
    if (existing) {
      existing.push(rule);
      continue;
    }
    rulesByProductId.set(rule.productId, [rule]);
  }

  for (const item of input.items) {
    const product = productById.get(item.productId);
    if (!product) {
      return {
        ok: false as const,
        message: "El carrito contiene productos inactivos o eliminados.",
      };
    }

    const productRules = (rulesByProductId.get(item.productId) ?? []).filter(
      (rule) => rule.isActive,
    );
    const allowedGroupIds = new Set(productRules.map((rule) => rule.groupId));
    const selectedCountByGroup = new Map<string, number>();
    let optionDeltaCents = 0;

    for (const selectedOption of item.options) {
      const option = optionById.get(selectedOption.optionId);
      if (!option || !option.isActive || !option.groupIsActive) {
        return {
          ok: false as const,
          message:
            "El carrito contiene opciones invalidas o inactivas. Actualiza el carrito y vuelve a intentar.",
        };
      }

      if (!allowedGroupIds.has(option.groupId)) {
        return {
          ok: false as const,
          message: "Una opcion seleccionada ya no pertenece al producto.",
        };
      }

      const optionQty = Math.max(1, Math.floor(selectedOption.quantity || 1));
      optionDeltaCents += option.priceDeltaCents * optionQty;

      selectedCountByGroup.set(
        option.groupId,
        (selectedCountByGroup.get(option.groupId) ?? 0) + optionQty,
      );
    }

    for (const rule of productRules) {
      const selectedCount = selectedCountByGroup.get(rule.groupId) ?? 0;

      if (selectedCount < rule.minSelect) {
        return {
          ok: false as const,
          message: "Faltan opciones requeridas en uno o mas productos.",
        };
      }

      if (selectedCount > rule.maxSelect) {
        return {
          ok: false as const,
          message: "Se excedio el maximo de opciones permitidas en un grupo.",
        };
      }
    }

    const latestUnitPrice = product.basePriceCents + optionDeltaCents;
    if (latestUnitPrice !== item.unitPriceCents) {
      return {
        ok: false as const,
        message:
          "Los precios cambiaron desde que agregaste productos al carrito. Actualiza tu carrito para continuar.",
      };
    }
  }

  return { ok: true as const };
}

export type {
  CheckoutCartItem,
  CheckoutOption,
  CheckoutProduct,
  ProductGroupRule,
};
