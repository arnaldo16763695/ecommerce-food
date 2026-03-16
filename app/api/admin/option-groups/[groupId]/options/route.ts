import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createOptionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  priceDeltaCents: z.number().int().min(0).max(1_000_000).optional(),
  sortOrder: z.number().int().min(1).max(9999).optional(),
  isActive: z.boolean().optional(),
});

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

export async function GET(_: NextRequest, { params }: Params) {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const { groupId } = await params;
  if (!groupId) {
    return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
  }

  const group = await prisma.optionGroup.findUnique({
    where: { id: groupId },
    select: { id: true },
  });
  if (!group) {
    return NextResponse.json({ error: "Option group not found" }, { status: 404 });
  }

  const options = await prisma.option.findMany({
    where: { groupId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      groupId: true,
      name: true,
      priceDeltaCents: true,
      isActive: true,
      sortOrder: true,
    },
  });

  return NextResponse.json({ data: options });
}

export async function POST(req: NextRequest, { params }: Params) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await params;
  if (!groupId) {
    return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
  }

  const group = await prisma.optionGroup.findUnique({
    where: { id: groupId },
    select: { id: true },
  });
  if (!group) {
    return NextResponse.json({ error: "Option group not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createOptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const nextSortOrder =
    parsed.data.sortOrder ??
    ((await prisma.option.aggregate({
      where: { groupId },
      _max: { sortOrder: true },
    }))["_max"].sortOrder ?? 0) +
      1;

  const sortConflict = await prisma.option.findFirst({
    where: { groupId, sortOrder: nextSortOrder },
    select: { id: true },
  });
  if (sortConflict) {
    return NextResponse.json(
      { error: "Sort order already in use for this group" },
      { status: 409 },
    );
  }

  const nameConflict = await prisma.option.findFirst({
    where: {
      groupId,
      name: parsed.data.name.trim(),
    },
    select: { id: true },
  });
  if (nameConflict) {
    return NextResponse.json(
      { error: "Option name already exists in this group" },
      { status: 409 },
    );
  }

  const created = await prisma.option.create({
    data: {
      groupId,
      name: parsed.data.name.trim(),
      priceDeltaCents: parsed.data.priceDeltaCents ?? 0,
      sortOrder: nextSortOrder,
      isActive: parsed.data.isActive ?? true,
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
    action: "CREATE",
    entityType: "OPTION",
    entityId: created.id,
    entityLabel: created.name,
    summary: `Creo la opcion ${created.name}.`,
    request: req,
    metadata: {
      groupId: created.groupId,
      priceDeltaCents: created.priceDeltaCents,
      sortOrder: created.sortOrder,
      isActive: created.isActive,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
