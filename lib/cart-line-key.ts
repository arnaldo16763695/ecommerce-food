export function buildCartLineKey(params: {
  productId: string;
  optionIds: string[];
  notes?: string;
}) {
  const optionIdsKey = [...params.optionIds].sort().join("|");
  const notesKey = (params.notes ?? "").trim().toLowerCase();
  return `${params.productId}::${optionIdsKey || "base"}::${notesKey || "no-notes"}`;
}

