export function buildCartLineKey(params: {
  productId: string;
  variantId?: string;
  optionIds: string[];
  notes?: string;
}) {
  const variantKey = params.variantId?.trim() || "base-variant";
  const optionIdsKey = [...params.optionIds].sort().join("|");
  const notesKey = (params.notes ?? "").trim().toLowerCase();
  return `${params.productId}::${variantKey}::${optionIdsKey || "base"}::${notesKey || "no-notes"}`;
}

