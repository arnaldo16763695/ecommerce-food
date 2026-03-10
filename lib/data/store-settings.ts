import "server-only";
import prisma from "@/lib/prisma";

export const DEFAULT_DELIVERY_FEE_CENTS = 1000;
export const DEFAULT_FREE_DELIVERY_MIN_CENTS = 10_000;
export const STORE_SETTINGS_KEY = "default";

export type DeliverySettings = {
  deliveryFeeCents: number;
  freeDeliveryMinCents: number;
};

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const row = await prisma.storeSettings
    .findUnique({
      where: { singletonKey: STORE_SETTINGS_KEY },
      select: {
        deliveryFeeCents: true,
        freeDeliveryMinCents: true,
      },
    })
    .catch(() => null);

  if (!row) {
    return {
      deliveryFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
      freeDeliveryMinCents: DEFAULT_FREE_DELIVERY_MIN_CENTS,
    };
  }

  return {
    deliveryFeeCents: row.deliveryFeeCents,
    freeDeliveryMinCents: row.freeDeliveryMinCents,
  };
}
