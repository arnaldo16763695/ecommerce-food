import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateOrderSchema = z
  .object({
    status: z
      .enum([
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY",
        "OUT_FOR_DELIVERY",
        "COMPLETED",
        "CANCELED",
      ])
      .optional(),
    paymentStatus: z.enum(["UNPAID", "PAID", "REFUNDED"]).optional(),
  })
  .refine(
    (value) => value.status !== undefined || value.paymentStatus !== undefined,
    {
      message: "At least one field is required",
    },
  );

type Params = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      fulfillmentType: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      notes: true,
      subtotalCents: true,
      taxCents: true,
      discountCents: true,
      deliveryFeeCents: true,
      totalCents: true,
      createdAt: true,
      address: {
        select: {
          address1: true,
          address2: true,
          city: true,
          notes: true,
          lat: true,
          lng: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          nameSnapshot: true,
          unitPriceCents: true,
          quantity: true,
          notes: true,
          options: {
            orderBy: { optionNameSnapshot: "asc" },
            select: {
              id: true,
              groupNameSnapshot: true,
              optionNameSnapshot: true,
              priceDeltaCents: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ data: order });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = updateOrderSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.paymentStatus !== undefined
        ? { paymentStatus: parsed.data.paymentStatus }
        : {}),
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      fulfillmentType: true,
      customerName: true,
      totalCents: true,
      createdAt: true,
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  return NextResponse.json({ data: updated });
}
