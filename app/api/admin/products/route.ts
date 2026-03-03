import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

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
