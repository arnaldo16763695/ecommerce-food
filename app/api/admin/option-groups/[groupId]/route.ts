import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateGroupSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    minSelect: z.number().int().min(0).max(20).optional(),
    maxSelect: z.number().int().min(1).max(20).optional(),
    sortOrder: z.number().int().min(1).max(9999).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.minSelect !== undefined ||
      v.maxSelect !== undefined ||
      v.sortOrder !== undefined ||
      v.isActive !== undefined,
    {
      message: "At least one field is required",
    },
  );

type Params = {
  params: Promise<{ groupId: string }>;
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

  const { groupId } = await params;
  if (!groupId) {
    return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.optionGroup.findUnique({
    where: { id: groupId },
    select: { id: true, minSelect: true, maxSelect: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Option group not found" }, { status: 404 });
  }

  const nextMin = parsed.data.minSelect ?? existing.minSelect;
  const nextMax = parsed.data.maxSelect ?? existing.maxSelect;
  if (nextMin > nextMax) {
    return NextResponse.json(
      { error: "minSelect cannot be greater than maxSelect" },
      { status: 400 },
    );
  }

  if (parsed.data.sortOrder !== undefined) {
    const sortConflict = await prisma.optionGroup.findFirst({
      where: {
        sortOrder: parsed.data.sortOrder,
        id: { not: groupId },
      },
      select: { id: true },
    });
    if (sortConflict) {
      return NextResponse.json(
        { error: "Sort order already in use" },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.optionGroup.update({
    where: { id: groupId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.minSelect !== undefined ? { minSelect: parsed.data.minSelect } : {}),
      ...(parsed.data.maxSelect !== undefined ? { maxSelect: parsed.data.maxSelect } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
    select: {
      id: true,
      name: true,
      minSelect: true,
      maxSelect: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          options: true,
          products: true,
        },
      },
    },
  });

  return NextResponse.json({ data: updated });
}
