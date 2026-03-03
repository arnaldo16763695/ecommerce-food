import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateProductSchema = z
  .object({
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    imageUrl: z.string().url().optional(),
    coverImageUrl: z.string().url().optional(),
  })
  .refine(
    (value) =>
      value.isActive !== undefined ||
      value.isFeatured !== undefined ||
      value.imageUrl !== undefined ||
      value.coverImageUrl !== undefined,
    {
      message: "At least one field is required",
    },
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
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id: productId },
      data: {
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
        ...(parsed.data.isFeatured !== undefined
          ? { isFeatured: parsed.data.isFeatured }
          : {}),
        ...(parsed.data.coverImageUrl !== undefined
          ? { coverImageUrl: parsed.data.coverImageUrl }
          : {}),
        ...(parsed.data.imageUrl !== undefined ? { coverImageUrl: parsed.data.imageUrl } : {}),
      },
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
          select: { id: true, url: true },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (parsed.data.imageUrl !== undefined) {
      const firstImage = product.images[0];
      if (firstImage) {
        await tx.productImage.update({
          where: { id: firstImage.id },
          data: { url: parsed.data.imageUrl },
        });
      } else {
        await tx.productImage.create({
          data: {
            productId,
            url: parsed.data.imageUrl,
            sortOrder: 0,
          },
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
    });
  });

  return NextResponse.json({ data: updated });
}
