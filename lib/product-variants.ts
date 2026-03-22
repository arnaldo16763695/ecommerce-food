import { getAvailableStock, isProductSoldOut } from "@/lib/product-stock";

type Trackable = {
  trackStock: boolean;
  stockQuantity: number;
};

type ProductVariantLike = Trackable & {
  id: string;
  name: string;
  priceDeltaCents: number;
  isActive: boolean;
};

type ProductWithVariantsLike = Trackable & {
  variants?: ProductVariantLike[];
};

export function getActiveVariants<T extends ProductVariantLike>(variants: T[] | undefined) {
  return (variants ?? []).filter((variant) => variant.isActive);
}

export function isVariantSoldOut(variant: Trackable) {
  return isProductSoldOut(variant);
}

export function getPurchasableStock(params: {
  product: Trackable;
  variant?: Trackable | null;
}) {
  if (params.variant?.trackStock) {
    return getAvailableStock(params.variant);
  }

  return getAvailableStock(params.product);
}

export function isProductSoldOutConsideringVariants(
  product: ProductWithVariantsLike,
) {
  const activeVariants = getActiveVariants(product.variants);
  if (activeVariants.length === 0) {
    return isProductSoldOut(product);
  }

  return activeVariants.every((variant) => isVariantSoldOut(variant));
}

export function buildProductDisplayName(productName: string, variantName?: string | null) {
  const normalizedVariant = variantName?.trim();
  if (!normalizedVariant) return productName;
  return `${productName} - ${normalizedVariant}`;
}
