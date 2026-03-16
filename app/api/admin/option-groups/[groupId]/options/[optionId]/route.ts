import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateOptionSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    priceDeltaCents: z.number().int().min(0).max(1_000_000).optional(),
    sortOrder: z.number().int().min(1).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.priceDeltaCents !== undefined ||
      v.sortOrder !== undefined ||
      v.isActive !== undefined,
    { message: "At least one field is required" },
  );

type Params = {
  params: Promise<{ groupId: string; optionId: string }>;
};

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId, optionId } = await params;
  if (!groupId || !optionId) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateOptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.option.findFirst({
    where: { id: optionId, groupId },
    select: { id: true, name: true, priceDeltaCents: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Option not found" }, { status: 404 });
  }

  if (parsed.data.sortOrder !== undefined) {
    const sortConflict = await prisma.option.findFirst({
      where: {
        groupId,
        sortOrder: parsed.data.sortOrder,
        id: { not: optionId },
      },
      select: { id: true },
    });
    if (sortConflict) {
      return NextResponse.json(
        { error: "Sort order already in use for this group" },
        { status: 409 },
      );
    }
  }

  if (parsed.data.name !== undefined) {
    const nameConflict = await prisma.option.findFirst({
      where: {
        groupId,
        name: parsed.data.name.trim(),
        id: { not: optionId },
      },
      select: { id: true },
    });
    if (nameConflict) {
      return NextResponse.json(
        { error: "Option name already exists in this group" },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.option.update({
    where: { id: optionId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.priceDeltaCents !== undefined
        ? { priceDeltaCents: parsed.data.priceDeltaCents }
        : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
    select: {
      id: true,
      groupId: true,
      name: true,
      priceDeltaCents: true,
      isActive: true,
      sortOrder: true,
    },
  });

  await createAuditLog({
    actor: session.user,
    action: "UPDATE",
    entityType: "OPTION",
    entityId: updated.id,
    entityLabel: updated.name,
    summary: `Actualizo la opcion ${updated.name}.`,
    request: req,
    metadata: {
      groupId: updated.groupId,
      previousName: existing.name,
      previousPriceDeltaCents: existing.priceDeltaCents,
      nextPriceDeltaCents: updated.priceDeltaCents,
      sortOrder: updated.sortOrder,
      isActive: updated.isActive,
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId, optionId } = await params;
  if (!groupId || !optionId) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const existing = await prisma.option.findFirst({
    where: { id: optionId, groupId },
    select: { id: true, name: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Option not found" }, { status: 404 });
  }

  await prisma.option.delete({ where: { id: optionId } });

  await createAuditLog({
    actor: session.user,
    action: "DELETE",
    entityType: "OPTION",
    entityId: existing.id,
    entityLabel: existing.name,
    summary: `Elimino la opcion ${existing.name}.`,
    request: req,
    metadata: {
      groupId,
    },
  });

  return NextResponse.json({ data: { id: optionId } });
}
