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

  if (session.user.role !== "ADMIN" && session.user.role !== "PREPARER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = toInt(searchParams.get("page"), DEFAULT_PAGE);
  const rawLimit = toInt(searchParams.get("limit"), DEFAULT_LIMIT);
  const limit = Math.min(rawLimit, MAX_LIMIT);
  const q = (searchParams.get("q") ?? "").trim();
  const status = (searchParams.get("status") ?? "ALL").trim();
  const paymentReviewStatus = (searchParams.get("paymentReviewStatus") ?? "ALL").trim();
  const skip = (page - 1) * limit;

  const andConditions: Array<Record<string, unknown>> = [];

  if (status !== "ALL") {
    andConditions.push({ status });
  }

  if (paymentReviewStatus !== "ALL") {
    andConditions.push({ paymentReviewStatus });
  }

  if (q) {
    const maybeOrderNumber = Number.parseInt(q, 10);
    andConditions.push({
      OR: [
        Number.isNaN(maybeOrderNumber) ? undefined : { orderNumber: maybeOrderNumber },
        { customerName: { contains: q, mode: "insensitive" as const } },
        { customerPhone: { contains: q, mode: "insensitive" as const } },
        { customerEmail: { contains: q, mode: "insensitive" as const } },
      ].filter(Boolean),
    });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : undefined;

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        paymentReviewStatus: true,
        fulfillmentType: true,
        customerName: true,
        totalCents: true,
        createdAt: true,
        assignedPreparer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: orders,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
