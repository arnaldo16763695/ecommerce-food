import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/slug";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const createProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(3000).optional(),
  basePriceCents: z.number().int().min(0).max(9_999_999),
  prepTimeMin: z.number().int().min(1).max(360).optional(),
  categoryId: z.string().trim().min(1).optional(),
  coverImageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().trim().max(180).optional(),
      }),
    )
    .max(12)
    .optional(),
  optionGroups: z
    .array(
      z.object({
        groupId: z.string().trim().min(1),
        sortOrder: z.number().int().min(1).max(9999).optional(),
      }),
    )
    .max(30)
    .optional(),
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
          { category: { is: { name: { contains: q, mode: "insensitive" as const } } } },
        ],
      }
    : undefined;

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        basePriceCents: true,
        coverImageUrl: true,
        isActive: true,
        isFeatured: true,
        createdAt: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: {
            url: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: products,
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
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = parsed.data;
  const normalizedName = payload.name.trim();
  const normalizedSlug = slugify(payload.slug?.trim() || normalizedName);

  if (!normalizedSlug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const existingSlug = await prisma.product.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (existingSlug) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
  }

  const categoryId = payload.categoryId?.trim() || undefined;
  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
  }

  const imageInputs = (payload.images ?? []).filter((img) => img.url);
  const coverImageUrl = payload.coverImageUrl ?? imageInputs[0]?.url;

  const optionGroups = payload.optionGroups ?? [];
  const uniqueGroupIds = new Set(optionGroups.map((item) => item.groupId));
  if (uniqueGroupIds.size !== optionGroups.length) {
    return NextResponse.json(
      { error: "Duplicated option group IDs are not allowed" },
      { status: 400 },
    );
  }

  if (uniqueGroupIds.size > 0) {
    const groups = await prisma.optionGroup.findMany({
      where: { id: { in: [...uniqueGroupIds] } },
      select: { id: true },
    });
    if (groups.length !== uniqueGroupIds.size) {
      return NextResponse.json(
        { error: "One or more option groups do not exist" },
        { status: 404 },
      );
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: normalizedName,
        slug: normalizedSlug,
        description: payload.description?.trim() || null,
        basePriceCents: payload.basePriceCents,
        prepTimeMin: payload.prepTimeMin ?? null,
        categoryId: categoryId ?? null,
        coverImageUrl: coverImageUrl ?? null,
        isActive: payload.isActive ?? true,
        isFeatured: payload.isFeatured ?? false,
      },
      select: { id: true },
    });

    if (imageInputs.length > 0) {
      await tx.productImage.createMany({
        data: imageInputs.map((image, idx) => ({
          productId: product.id,
          url: image.url,
          alt: image.alt?.trim() || null,
          sortOrder: idx + 1,
        })),
      });
    }

    if (optionGroups.length > 0) {
      await tx.productOptionGroup.createMany({
        data: optionGroups.map((group, idx) => ({
          productId: product.id,
          groupId: group.groupId,
          sortOrder: group.sortOrder ?? idx + 1,
        })),
      });
    }

    return tx.product.findUniqueOrThrow({
      where: { id: product.id },
      select: {
        id: true,
        name: true,
        slug: true,
        basePriceCents: true,
        coverImageUrl: true,
        isActive: true,
        isFeatured: true,
        createdAt: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
