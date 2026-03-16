import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import {
  DEFAULT_DELIVERY_FEE_CENTS,
  DEFAULT_FREE_DELIVERY_MIN_CENTS,
  STORE_SETTINGS_KEY,
} from "@/lib/data/store-settings";
import { z } from "zod";

const updateDeliverySettingsSchema = z.object({
  deliveryFeeCents: z.coerce.number().int().min(0).max(10_000_000),
  freeDeliveryMinCents: z.coerce.number().int().min(0).max(100_000_000),
});

function toResponseData(input: {
  deliveryFeeCents: number;
  freeDeliveryMinCents: number;
}) {
  return {
    deliveryFeeCents: input.deliveryFeeCents,
    freeDeliveryMinCents: input.freeDeliveryMinCents,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await prisma.storeSettings.findUnique({
    where: { singletonKey: STORE_SETTINGS_KEY },
    select: {
      deliveryFeeCents: true,
      freeDeliveryMinCents: true,
    },
  });

  return NextResponse.json({
    data: row
      ? toResponseData(row)
      : toResponseData({
          deliveryFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
          freeDeliveryMinCents: DEFAULT_FREE_DELIVERY_MIN_CENTS,
        }),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateDeliverySettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const previous = await prisma.storeSettings.findUnique({
    where: { singletonKey: STORE_SETTINGS_KEY },
    select: {
      deliveryFeeCents: true,
      freeDeliveryMinCents: true,
    },
  });

  const saved = await prisma.storeSettings.upsert({
    where: { singletonKey: STORE_SETTINGS_KEY },
    update: {
      deliveryFeeCents: parsed.data.deliveryFeeCents,
      freeDeliveryMinCents: parsed.data.freeDeliveryMinCents,
    },
    create: {
      singletonKey: STORE_SETTINGS_KEY,
      deliveryFeeCents: parsed.data.deliveryFeeCents,
      freeDeliveryMinCents: parsed.data.freeDeliveryMinCents,
    },
    select: {
      deliveryFeeCents: true,
      freeDeliveryMinCents: true,
    },
  });

  await createAuditLog({
    actor: session.user,
    action: "UPDATE",
    entityType: "STORE_SETTINGS",
    entityId: STORE_SETTINGS_KEY,
    entityLabel: "Reglas de delivery",
    summary: "Actualizo las reglas de delivery de la tienda.",
    request: req,
    metadata: {
      previous: previous
        ? toResponseData(previous)
        : toResponseData({
            deliveryFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
            freeDeliveryMinCents: DEFAULT_FREE_DELIVERY_MIN_CENTS,
          }),
      next: toResponseData(saved),
    },
  });

  return NextResponse.json({ data: toResponseData(saved) });
}
