import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updatePreparationSchema = z.object({
  isPrepared: z.boolean(),
});

type Params = {
  params: Promise<{ orderId: string; orderItemId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isPreparer = session.user.role === "PREPARER";
  if (!isAdmin && !isPreparer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId, orderItemId } = await params;
  if (!orderId || !orderItemId) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = updatePreparationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      assignedPreparerId: true,
      items: {
        where: { id: orderItemId },
        select: { id: true },
      },
    },
  });

  if (!order || order.items.length === 0) {
    return NextResponse.json({ error: "Order item not found" }, { status: 404 });
  }

  if (isPreparer) {
    if (order.status !== "PREPARING") {
      return NextResponse.json(
        { error: "Solo se puede preparar items cuando el pedido esta en PREPARING." },
        { status: 409 },
      );
    }

    if (order.assignedPreparerId !== session.user.id) {
      return NextResponse.json(
        { error: "Este pedido esta asignado a otro preparador." },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.orderPreparationItem.upsert({
    where: { orderItemId },
    create: {
      orderId,
      orderItemId,
      isPrepared: parsed.data.isPrepared,
      preparedAt: parsed.data.isPrepared ? new Date() : null,
      preparedByUserId: parsed.data.isPrepared ? session.user.id : null,
    },
    update: {
      isPrepared: parsed.data.isPrepared,
      preparedAt: parsed.data.isPrepared ? new Date() : null,
      preparedByUserId: parsed.data.isPrepared ? session.user.id : null,
    },
    select: {
      id: true,
      orderId: true,
      orderItemId: true,
      isPrepared: true,
      preparedAt: true,
      preparedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ data: updated });
}

