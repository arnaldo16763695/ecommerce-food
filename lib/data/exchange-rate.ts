import "server-only";
import prisma from "@/lib/prisma";

export type ActiveUsdVesRate = {
  id: string;
  rate: number;
  source: string | null;
  effectiveAt: Date;
  updatedAt: Date;
} | null;

export async function getActiveUsdVesRate(): Promise<ActiveUsdVesRate> {
  const row = await prisma.exchangeRate
    .findFirst({
      where: {
        baseCurrency: "USD",
        quoteCurrency: "VES",
        isActive: true,
      },
      orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        rate: true,
        source: true,
        effectiveAt: true,
        updatedAt: true,
      },
    })
    .catch(() => null);

  if (!row) return null;

  return {
    id: row.id,
    rate: Number(row.rate),
    source: row.source,
    effectiveAt: row.effectiveAt,
    updatedAt: row.updatedAt,
  };
}
