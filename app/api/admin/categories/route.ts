import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/slug";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(120).optional(),
  sortOrder: z.number().int().min(1).max(9999).optional(),
  isActive: z.boolean().optional(),
  imgUrl: z.string().trim().min(1).optional(),
});

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = toInt(searchParams.get("page"), DEFAULT_PAGE);
  const rawLimit = toInt(searchParams.get("limit"), DEFAULT_LIMIT);
  const limit = Math.min(rawLimit, MAX_LIMIT);
  const q = (searchParams.get("q") ?? "").trim();
  const skip = (page - 1) * limit;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [total, categories] = await prisma.$transaction([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        sortOrder: true,
        isActive: true,
        imgUrl: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: categories,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const normalizedName = parsed.data.name.trim();
  // If slug is not provided, derive it from name to keep URLs consistent.
  const normalizedSlug = slugify(parsed.data.slug?.trim() || normalizedName);

  if (!normalizedSlug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const existingSlug = await prisma.category.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (existingSlug) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  // Keep sort positions predictable: if not provided, append to the end.
  const nextSortOrder =
    parsed.data.sortOrder ??
    ((await prisma.category.aggregate({
      _max: {
        sortOrder: true,
      },
    }))["_max"].sortOrder ?? 0) +
      1;

  const existingSortOrder = await prisma.category.findFirst({
    where: { sortOrder: nextSortOrder },
    select: { id: true },
  });
  if (existingSortOrder) {
    return NextResponse.json(
      { error: "Sort order already in use" },
      { status: 409 },
    );
  }

  const created = await prisma.category.create({
    data: {
      name: normalizedName,
      slug: normalizedSlug,
      sortOrder: nextSortOrder,
      isActive: parsed.data.isActive ?? true,
      imgUrl: parsed.data.imgUrl?.trim() || "/images/category-img.png",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sortOrder: true,
      isActive: true,
      imgUrl: true,
      createdAt: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
