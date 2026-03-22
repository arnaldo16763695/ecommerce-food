import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

const updateVariantSchema = z
  .object({
    stockQuantity: z.number().int().min(0).max(999_999).optional(),
    trackStock: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.stockQuantity !== undefined ||
      value.trackStock !== undefined ||
      value.isActive !== undefined,
    {
      message: "At least one field is required",
    },
  );

type Params = {
  params: Promise<{ productId: string; variantId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  const { productId, variantId } = await params;
  if (!productId || !variantId) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = updateVariantSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const existing = await prisma.productVariant.findFirst({
    where: {
      id: variantId,
      productId,
    },
    select: {
      id: true,
      name: true,
      stockQuantity: true,
      trackStock: true,
      isActive: true,
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 });
  }

  const data = parsed.data;

  const updated = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      ...(data.trackStock !== undefined ? { trackStock: data.trackStock } : {}),
      ...(data.stockQuantity !== undefined
        ? {
            stockQuantity: data.stockQuantity,
          }
        : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: {
      id: true,
      name: true,
      stockQuantity: true,
      trackStock: true,
      isActive: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  await createAuditLog({
    actor: session.user,
    action: "UPDATE",
    entityType: "PRODUCT_VARIANT",
    entityId: updated.id,
    entityLabel: `${updated.product.name} - ${updated.name}`,
    summary: `Actualizó el stock de la variante ${updated.name}.`,
    request: req,
    metadata: {
      productId: updated.productId,
      productName: updated.product.name,
      previousStockQuantity: existing.stockQuantity,
      nextStockQuantity: updated.stockQuantity,
      previousTrackStock: existing.trackStock,
      nextTrackStock: updated.trackStock,
      previousIsActive: existing.isActive,
      nextIsActive: updated.isActive,
    },
  });

  return NextResponse.json({ data: updated });
}
