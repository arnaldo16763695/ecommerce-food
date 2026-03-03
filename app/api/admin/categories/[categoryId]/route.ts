import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/slug";

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    slug: z.string().trim().min(2).max(120).optional(),
    sortOrder: z.number().int().min(1).max(9999).optional(),
    isActive: z.boolean().optional(),
    imgUrl: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.slug !== undefined ||
      value.sortOrder !== undefined ||
      value.isActive !== undefined ||
      value.imgUrl !== undefined,
    {
      message: "At least one field is required",
    },
  );

type Params = {
  params: Promise<{ categoryId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { categoryId } = await params;
  if (!categoryId) {
    return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existingCategory = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true },
  });

  if (!existingCategory) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const nextName = parsed.data.name?.trim();
  const nextSlugRaw = parsed.data.slug ?? nextName;
  const nextSlug = nextSlugRaw ? slugify(nextSlugRaw) : undefined;

  if (nextSlug !== undefined && !nextSlug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  if (nextSlug && nextSlug !== existingCategory.slug) {
    const slugInUse = await prisma.category.findUnique({
      where: { slug: nextSlug },
      select: { id: true },
    });

    if (slugInUse && slugInUse.id !== categoryId) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
  }

  if (parsed.data.sortOrder !== undefined) {
    const sortInUse = await prisma.category.findFirst({
      where: {
        sortOrder: parsed.data.sortOrder,
        id: { not: categoryId },
      },
      select: { id: true },
    });

    if (sortInUse) {
      return NextResponse.json(
        { error: "Sort order already in use" },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(nextName !== undefined ? { name: nextName } : {}),
      ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
      ...(parsed.data.sortOrder !== undefined
        ? { sortOrder: parsed.data.sortOrder }
        : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.imgUrl !== undefined ? { imgUrl: parsed.data.imgUrl.trim() } : {}),
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

  return NextResponse.json({ data: updated });
}
