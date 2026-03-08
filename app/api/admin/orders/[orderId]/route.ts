import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publishKitchenEvent } from "@/lib/kitchen-events";
import {
  canTransitionOrderStatus,
  canTransitionPaymentStatus,
} from "@/lib/order-workflow";
import { z } from "zod";

const updateOrderSchema = z
  .object({
    action: z.enum(["TAKE", "RELEASE"]).optional(),
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
    (value) =>
      value.status !== undefined ||
      value.paymentStatus !== undefined ||
      value.action !== undefined,
    {
      message: "At least one field is required",
    },
  );

type Params = {
  params: Promise<{ orderId: string }>;
};

const orderSummarySelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
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
} as const;

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "PREPARER") {
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
      assignedAt: true,
      assignedPreparer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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
      preparationItems: {
        select: {
          id: true,
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

  const isAdmin = session.user.role === "ADMIN";
  const isPreparer = session.user.role === "PREPARER";

  if (!isAdmin && !isPreparer) {
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

  if (
    parsed.data.action !== undefined &&
    (parsed.data.status !== undefined || parsed.data.paymentStatus !== undefined)
  ) {
    return NextResponse.json(
      { error: "Action cannot be combined with status or paymentStatus updates." },
      { status: 400 },
    );
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      fulfillmentType: true,
      paymentStatus: true,
      assignedPreparerId: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (parsed.data.action === "TAKE") {
    const taken = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: "CONFIRMED",
        assignedPreparerId: null,
      },
      data: {
        status: "PREPARING",
        assignedPreparerId: session.user.id,
        assignedAt: new Date(),
      },
    });

    if (taken.count === 0) {
      return NextResponse.json(
        { error: "No se pudo tomar el pedido. Ya fue tomado o no esta en CONFIRMED." },
        { status: 409 },
      );
    }

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      select: orderSummarySelect,
    });

    if (updated) {
      publishKitchenEvent({
        type: "ORDER_STATUS_CHANGED",
        orderId: updated.id,
        orderNumber: updated.orderNumber,
      });
    }

    return NextResponse.json({ data: updated });
  }

  if (parsed.data.action === "RELEASE") {
    const releaseWhere =
      isAdmin
        ? {
            id: orderId,
            status: "PREPARING" as const,
          }
        : {
            id: orderId,
            status: "PREPARING" as const,
            assignedPreparerId: session.user.id,
          };

    const released = await prisma.order.updateMany({
      where: releaseWhere,
      data: {
        status: "CONFIRMED",
        assignedPreparerId: null,
        assignedAt: null,
      },
    });

    if (released.count === 0) {
      return NextResponse.json(
        {
          error:
            "No se pudo liberar el pedido. Debe estar en PREPARING y asignado al preparador correcto.",
        },
        { status: 409 },
      );
    }

    await prisma.orderPreparationItem.updateMany({
      where: { orderId },
      data: {
        isPrepared: false,
        preparedAt: null,
        preparedByUserId: null,
      },
    });

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      select: orderSummarySelect,
    });

    if (updated) {
      publishKitchenEvent({
        type: "ORDER_STATUS_CHANGED",
        orderId: updated.id,
        orderNumber: updated.orderNumber,
      });
    }

    return NextResponse.json({ data: updated });
  }

  if (isPreparer) {
    if (parsed.data.paymentStatus !== undefined) {
      return NextResponse.json(
        { error: "PREPARER cannot update payment status" },
        { status: 403 },
      );
    }

    if (!parsed.data.status) {
      return NextResponse.json(
        { error: "PREPARER can only update operational order status" },
        { status: 400 },
      );
    }

    if (
      !canTransitionOrderStatus(
        existing.status,
        parsed.data.status,
        existing.fulfillmentType,
      )
    ) {
      return NextResponse.json(
        {
          error: `Transicion no permitida: ${existing.status} -> ${parsed.data.status}.`,
        },
        { status: 409 },
      );
    }

    if (parsed.data.status !== "PREPARING" && parsed.data.status !== "READY") {
      return NextResponse.json(
        { error: "PREPARER can only set PREPARING or READY" },
        { status: 403 },
      );
    }

    if (parsed.data.status === "PREPARING") {
      const claimed = await prisma.order.updateMany({
        where: {
          id: orderId,
          status: "CONFIRMED",
          assignedPreparerId: null,
        },
        data: {
          status: "PREPARING",
          assignedPreparerId: session.user.id,
          assignedAt: new Date(),
        },
      });

      if (claimed.count === 0) {
        return NextResponse.json(
          {
            error: "El pedido ya fue tomado por otro preparador o no esta en CONFIRMED.",
          },
          { status: 409 },
        );
      }

      const updated = await prisma.order.findUnique({
        where: { id: orderId },
        select: orderSummarySelect,
      });

      if (updated) {
        publishKitchenEvent({
          type: "ORDER_STATUS_CHANGED",
          orderId: updated.id,
          orderNumber: updated.orderNumber,
        });
      }

      return NextResponse.json({ data: updated });
    }

    const [totalOrderItems, preparedItems] = await prisma.$transaction([
      prisma.orderItem.count({
        where: {
          orderId,
        },
      }),
      prisma.orderPreparationItem.count({
        where: {
          orderId,
          isPrepared: true,
        },
      }),
    ]);

    if (totalOrderItems === 0 || preparedItems < totalOrderItems) {
      return NextResponse.json(
        {
          error: "No puedes cerrar el pedido. Faltan items por preparar en el checklist.",
        },
        { status: 400 },
      );
    }

    const completed = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: "PREPARING",
        assignedPreparerId: session.user.id,
      },
      data: {
        status: "READY",
      },
    });

    if (completed.count === 0) {
      return NextResponse.json(
        {
          error:
            "No puedes marcar este pedido como listo porque no esta asignado a tu usuario.",
        },
        { status: 409 },
      );
    }

    const updated = await prisma.order.findUnique({
      where: { id: orderId },
      select: orderSummarySelect,
    });

    if (updated) {
      publishKitchenEvent({
        type: "ORDER_STATUS_CHANGED",
        orderId: updated.id,
        orderNumber: updated.orderNumber,
      });
    }

    return NextResponse.json({ data: updated });
  }

  if (
    parsed.data.status !== undefined &&
    !canTransitionOrderStatus(
      existing.status,
      parsed.data.status,
      existing.fulfillmentType,
    )
  ) {
    return NextResponse.json(
      {
        error: `Transicion de estado no permitida: ${existing.status} -> ${parsed.data.status}.`,
      },
      { status: 409 },
    );
  }

  if (
    parsed.data.paymentStatus !== undefined &&
    !canTransitionPaymentStatus(existing.paymentStatus, parsed.data.paymentStatus)
  ) {
    return NextResponse.json(
      {
        error: `Transicion de pago no permitida: ${existing.paymentStatus} -> ${parsed.data.paymentStatus}.`,
      },
      { status: 409 },
    );
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.paymentStatus !== undefined
        ? { paymentStatus: parsed.data.paymentStatus }
        : {}),
    },
    select: orderSummarySelect,
  });

  publishKitchenEvent({
    type: "ORDER_STATUS_CHANGED",
    orderId: updated.id,
    orderNumber: updated.orderNumber,
  });

  return NextResponse.json({ data: updated });
}
