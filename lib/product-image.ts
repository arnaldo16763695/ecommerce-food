const LOCAL_IMAGE_FALLBACK = "product-1.png";

function isAbsoluteHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function resolveProductImageSrc(
  imageUrl: string | null | undefined,
  fallback: string = LOCAL_IMAGE_FALLBACK,
) {
  const normalized = imageUrl?.trim();

  if (!normalized) return `/images/${fallback}`;
  if (isAbsoluteHttpUrl(normalized)) return normalized;
  if (normalized.startsWith("/")) return normalized;

  return `/images/${normalized}`;
}
