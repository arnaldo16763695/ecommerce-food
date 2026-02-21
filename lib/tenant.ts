import { cache } from "react";
import prisma from "@/lib/prisma";

export const getTenantBySlug = cache(async (slug?: string) => {
  const normalized = (slug ?? "").trim().toLowerCase();
  if (!normalized) return null;

  return prisma.tenant.findUnique({
    where: { slug: normalized },
    select: { id: true, name: true, slug: true, currency: true, timezone: true },
  });
});