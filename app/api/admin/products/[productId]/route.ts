import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/slug";

const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    slug: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(3000).optional(),
    basePriceCents: z.number().int().min(0).max(9_999_999).optional(),
    prepTimeMin: z.number().int().min(1).max(360).nullable().optional(),
    trackStock: z.boolean().optional(),
    stockQuantity: z.number().int().min(0).max(999_999).optional(),
    categoryId: z.string().trim().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    variants: z
      .array(
        z.object({
          id: z.string().trim().min(1).optional(),
          name: z.string().trim().min(1).max(120),
          priceDeltaCents: z.number().int().min(0).max(9_999_999),
          isActive: z.boolean().optional(),
          trackStock: z.boolean().optional(),
          stockQuantity: z.number().int().min(0).max(999_999).optional(),
          sortOrder: z.number().int().min(1).max(9999).optional(),
        }),
      )
      .max(50)
      .optional(),
    imageUrl: z.string().url().optional(),
    coverImageUrl: z.string().url().nullable().optional(),
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
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.slug !== undefined ||
      value.description !== undefined ||
      value.basePriceCents !== undefined ||
      value.prepTimeMin !== undefined ||
      value.trackStock !== undefined ||
      value.stockQuantity !== undefined ||
      value.categoryId !== undefined ||
      value.isActive !== undefined ||
      value.isFeatured !== undefined ||
      value.variants !== undefined ||
      value.imageUrl !== undefined ||
      value.coverImageUrl !== undefined ||
      value.images !== undefined ||
      value.optionGroups !== undefined,
    { message: "At least one field is required" },
  );

type Params = {
  params: Promise<{ productId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { productId } = await params;
  if (!productId) {
    return NextResponse.json({ error: "Invalid productId" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      basePriceCents: true,
      trackStock: true,
      stockQuantity: true,
      variants: {
        select: {
          id: true,
          name: true,
          priceDeltaCents: true,
          isActive: true,
          trackStock: true,
          stockQuantity: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const data = parsed.data;

  const nextName = data.name?.trim() ?? existing.name;
  const normalizedSlug =
    data.slug !== undefined ? slugify(data.slug.trim() || nextName) : undefined;
  if (normalizedSlug !== undefined && !normalizedSlug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }
  if (normalizedSlug !== undefined) {
    const slugInUse = await prisma.product.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    });
    if (slugInUse && slugInUse.id !== productId) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
  }

  if (data.categoryId !== undefined && data.categoryId !== null) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
  }

  if (data.variants !== undefined) {
    const uniqueVariantNames = new Set(
      data.variants.map((variant) => variant.name.trim().toLowerCase()),
    );
    if (uniqueVariantNames.size !== data.variants.length) {
      return NextResponse.json(
        { error: "No se permiten nombres de variantes duplicados." },
        { status: 400 },
      );
    }
  }

  if (data.optionGroups !== undefined) {
    const uniqueGroupIds = new Set(data.optionGroups.map((item) => item.groupId));
    if (uniqueGroupIds.size !== data.optionGroups.length) {
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
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Keep this as the single source of truth for product scalar fields.
    await tx.product.update({
      where: { id: productId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(normalizedSlug !== undefined ? { slug: normalizedSlug } : {}),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
        ...(data.basePriceCents !== undefined
          ? { basePriceCents: data.basePriceCents }
          : {}),
        ...(data.prepTimeMin !== undefined ? { prepTimeMin: data.prepTimeMin } : {}),
        ...(data.trackStock !== undefined ? { trackStock: data.trackStock } : {}),
        ...(data.stockQuantity !== undefined
          ? { stockQuantity: data.stockQuantity }
          : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.coverImageUrl !== undefined
          ? { coverImageUrl: data.coverImageUrl }
          : {}),
        ...(data.imageUrl !== undefined ? { coverImageUrl: data.imageUrl } : {}),
      },
    });

    if (data.images !== undefined) {
      await tx.productImage.deleteMany({ where: { productId } });
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((image, idx) => ({
            productId,
            url: image.url,
            alt: image.alt?.trim() || null,
            sortOrder: idx + 1,
          })),
        });
      }
    } else if (data.imageUrl !== undefined) {
      const firstImage = await tx.productImage.findFirst({
        where: { productId },
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });

      if (firstImage) {
        await tx.productImage.update({
          where: { id: firstImage.id },
          data: { url: data.imageUrl },
        });
      } else {
        await tx.productImage.create({
          data: {
            productId,
            url: data.imageUrl,
            sortOrder: 1,
          },
        });
      }
    }

    if (data.variants !== undefined) {
      await tx.productVariant.deleteMany({ where: { productId } });
      if (data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map((variant, idx) => ({
            productId,
            name: variant.name.trim(),
            priceDeltaCents: variant.priceDeltaCents,
            isActive: variant.isActive ?? true,
            trackStock: variant.trackStock ?? false,
            stockQuantity: variant.trackStock ? variant.stockQuantity ?? 0 : 0,
            sortOrder: variant.sortOrder ?? idx + 1,
          })),
        });
      }
    }

    if (data.optionGroups !== undefined) {
      await tx.productOptionGroup.deleteMany({ where: { productId } });
      if (data.optionGroups.length > 0) {
        await tx.productOptionGroup.createMany({
          data: data.optionGroups.map((group, idx) => ({
            productId,
            groupId: group.groupId,
            sortOrder: group.sortOrder ?? idx + 1,
          })),
        });
      }
    }

    return tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        basePriceCents: true,
        coverImageUrl: true,
        isActive: true,
        isFeatured: true,
        trackStock: true,
        stockQuantity: true,
        variants: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            priceDeltaCents: true,
            isActive: true,
            trackStock: true,
            stockQuantity: true,
            sortOrder: true,
          },
        },
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

  await createAuditLog({
    actor: session.user,
    action: "UPDATE",
    entityType: "PRODUCT",
    entityId: updated.id,
    entityLabel: updated.name,
    summary: `Actualizo el producto ${updated.name}.`,
    request: req,
    metadata: {
      previousName: existing.name,
      previousSlug: existing.slug,
      nextSlug: updated.slug,
      previousBasePriceCents: existing.basePriceCents,
      nextBasePriceCents: updated.basePriceCents,
      previousTrackStock: existing.trackStock,
      nextTrackStock: updated.trackStock,
      previousStockQuantity: existing.stockQuantity,
      nextStockQuantity: updated.stockQuantity,
      previousVariants: (existing.variants ?? []).map((variant) => ({
        id: variant.id,
        name: variant.name,
        priceDeltaCents: variant.priceDeltaCents,
        isActive: variant.isActive,
        trackStock: variant.trackStock,
        stockQuantity: variant.stockQuantity,
      })),
      nextVariants: (updated.variants ?? []).map((variant) => ({
        id: variant.id,
        name: variant.name,
        priceDeltaCents: variant.priceDeltaCents,
        isActive: variant.isActive,
        trackStock: variant.trackStock,
        stockQuantity: variant.stockQuantity,
      })),
      categoryId: updated.category?.id ?? null,
      isActive: updated.isActive,
      isFeatured: updated.isFeatured,
    },
  });

  return NextResponse.json({ data: updated });
}
