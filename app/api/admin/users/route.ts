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
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { email: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
      },
    }),
  ]);

  return NextResponse.json({
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
