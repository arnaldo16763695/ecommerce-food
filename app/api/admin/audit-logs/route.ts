import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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
  const action = (searchParams.get("action") ?? "ALL").trim();
  const entityType = (searchParams.get("entityType") ?? "ALL").trim();
  const skip = (page - 1) * limit;

  const andConditions: Array<Record<string, unknown>> = [];

  if (action !== "ALL") {
    andConditions.push({ action });
  }

  if (entityType !== "ALL") {
    andConditions.push({ entityType });
  }

  if (q) {
    andConditions.push({
      OR: [
        { summary: { contains: q, mode: "insensitive" as const } },
        { entityLabel: { contains: q, mode: "insensitive" as const } },
        { entityId: { contains: q, mode: "insensitive" as const } },
        { routePath: { contains: q, mode: "insensitive" as const } },
        { actorUser: { is: { name: { contains: q, mode: "insensitive" as const } } } },
        { actorUser: { is: { email: { contains: q, mode: "insensitive" as const } } } },
      ],
    });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : undefined;

  const [total, auditLogs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        entityLabel: true,
        summary: true,
        routePath: true,
        method: true,
        ipAddress: true,
        metadata: true,
        actorRole: true,
        createdAt: true,
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: auditLogs,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
