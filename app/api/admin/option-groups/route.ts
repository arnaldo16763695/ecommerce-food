import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  minSelect: z.number().int().min(0).max(20).optional(),
  maxSelect: z.number().int().min(1).max(20).optional(),
  sortOrder: z.number().int().min(1).max(9999).optional(),
  isActive: z.boolean().optional(),
});

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

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

export async function GET(req: NextRequest) {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const page = toInt(searchParams.get("page"), DEFAULT_PAGE);
  const rawLimit = toInt(searchParams.get("limit"), DEFAULT_LIMIT);
  const limit = Math.min(rawLimit, MAX_LIMIT);
  const q = (searchParams.get("q") ?? "").trim();
  const skip = (page - 1) * limit;

  const where = q
    ? {
        name: {
          contains: q,
          mode: "insensitive" as const,
        },
      }
    : undefined;

  const [total, groups] = await prisma.$transaction([
    prisma.optionGroup.count({ where }),
    prisma.optionGroup.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
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
    }),
  ]);

  return NextResponse.json({
    data: groups,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function POST(req: NextRequest) {
  const guard = await ensureAdmin();
  if (guard) return guard;

  const body = await req.json().catch(() => null);
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const minSelect = parsed.data.minSelect ?? 0;
  const maxSelect = parsed.data.maxSelect ?? 1;
  if (minSelect > maxSelect) {
    return NextResponse.json(
      { error: "minSelect cannot be greater than maxSelect" },
      { status: 400 },
    );
  }

  const nextSortOrder =
    parsed.data.sortOrder ??
    ((await prisma.optionGroup.aggregate({
      _max: { sortOrder: true },
    }))["_max"].sortOrder ?? 0) +
      1;

  const sortConflict = await prisma.optionGroup.findFirst({
    where: { sortOrder: nextSortOrder },
    select: { id: true },
  });
  if (sortConflict) {
    return NextResponse.json(
      { error: "Sort order already in use" },
      { status: 409 },
    );
  }

  const created = await prisma.optionGroup.create({
    data: {
      name: parsed.data.name.trim(),
      minSelect,
      maxSelect,
      sortOrder: nextSortOrder,
      isActive: parsed.data.isActive ?? true,
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

  return NextResponse.json({ data: created }, { status: 201 });
}
