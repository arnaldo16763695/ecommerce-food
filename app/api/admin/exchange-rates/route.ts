import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createExchangeRateSchema = z.object({
  rate: z.coerce.number().positive().max(9_999_999),
  source: z.string().trim().max(100).optional(),
  effectiveAt: z.string().datetime().optional(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rates = await prisma.exchangeRate.findMany({
    where: {
      baseCurrency: "USD",
      quoteCurrency: "VES",
    },
    orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
    take: 20,
    select: {
      id: true,
      baseCurrency: true,
      quoteCurrency: true,
      rate: true,
      source: true,
      isActive: true,
      effectiveAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    data: rates.map((item) => ({
      ...item,
      rate: Number(item.rate),
    })),
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
  const parsed = createExchangeRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const effectiveAt = parsed.data.effectiveAt
    ? new Date(parsed.data.effectiveAt)
    : new Date();

  const created = await prisma.$transaction(async (tx) => {
    await tx.exchangeRate.updateMany({
      where: {
        baseCurrency: "USD",
        quoteCurrency: "VES",
        isActive: true,
      },
      data: { isActive: false },
    });

    return tx.exchangeRate.create({
      data: {
        baseCurrency: "USD",
        quoteCurrency: "VES",
        rate: parsed.data.rate,
        source: parsed.data.source?.trim() || null,
        isActive: true,
        effectiveAt,
      },
      select: {
        id: true,
        baseCurrency: true,
        quoteCurrency: true,
        rate: true,
        source: true,
        isActive: true,
        effectiveAt: true,
        updatedAt: true,
      },
    });
  });

  return NextResponse.json(
    {
      data: {
        ...created,
        rate: Number(created.rate),
      },
    },
    { status: 201 },
  );
}
