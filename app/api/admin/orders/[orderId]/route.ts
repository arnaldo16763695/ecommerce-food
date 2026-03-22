import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { publishKitchenEvent } from "@/lib/kitchen-events";
import {
  sendPaymentApprovedToCustomer,
  sendPaymentRejectedToCustomer,
} from "@/lib/notifications/order-notifications";
import {
  canTransitionOrderStatus,
  canTransitionPaymentStatus,
} from "@/lib/order-workflow";
import { z } from "zod";

const updateOrderSchema = z
  .object({
    action: z.enum(["TAKE", "RELEASE", "APPROVE_PAYMENT", "REJECT_PAYMENT_REVIEW"]).optional(),
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
    reviewNote: z.string().trim().max(1000).optional(),
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
  paymentReviewStatus: true,
  paymentMethod: true,
  paymentReference: true,
  paymentProofUrl: true,
  fulfillmentType: true,
  customerName: true,
  customerEmail: true,
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
      paymentReviewStatus: true,
      paymentMethod: true,
      paymentReference: true,
      paymentProofUrl: true,
      paymentProofPath: true,
      paymentReviewNotes: true,
      paymentReviewedAt: true,
      paymentReviewedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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
      paymentReviewStatus: true,
      paymentMethod: true,
      paymentReference: true,
      paymentProofUrl: true,
      customerName: true,
      customerEmail: true,
      assignedPreparerId: true,
      items: {
        select: {
          productId: true,
          productVariantId: true,
          quantity: true,
        },
      },
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

      await createAuditLog({
        actor: session.user,
        action: "ASSIGN",
        entityType: "ORDER",
        entityId: updated.id,
        entityLabel: `Pedido #${updated.orderNumber}`,
        summary: `Tomo el pedido #${updated.orderNumber} para preparacion.`,
        request: req,
        metadata: {
          orderNumber: updated.orderNumber,
          previousStatus: existing.status,
          nextStatus: updated.status,
          assignedPreparerId: updated.assignedPreparer?.id ?? session.user.id,
        },
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

      await createAuditLog({
        actor: session.user,
        action: "RELEASE",
        entityType: "ORDER",
        entityId: updated.id,
        entityLabel: `Pedido #${updated.orderNumber}`,
        summary: `Libero el pedido #${updated.orderNumber}.`,
        request: req,
        metadata: {
          orderNumber: updated.orderNumber,
          previousStatus: "PREPARING",
          nextStatus: updated.status,
        },
      });
    }

    return NextResponse.json({ data: updated });
  }

  if (parsed.data.action === "APPROVE_PAYMENT") {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Solo ADMIN puede aprobar pagos." },
        { status: 403 },
      );
    }

    if (existing.paymentMethod === "IN_STORE") {
      return NextResponse.json(
        { error: "Los pagos en tienda fisica no requieren revision manual." },
        { status: 409 },
      );
    }

    if (!existing.paymentProofUrl && !existing.paymentReference) {
      return NextResponse.json(
        { error: "Este pedido no tiene comprobante ni referencia para revisar." },
        { status: 409 },
      );
    }

    if (existing.paymentStatus === "REFUNDED") {
      return NextResponse.json(
        { error: "No se puede aprobar un pago ya reembolsado." },
        { status: 409 },
      );
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paymentReviewStatus: "APPROVED",
        paymentReviewNotes: parsed.data.reviewNote?.trim() || null,
        paymentReviewedAt: new Date(),
        paymentReviewedByUserId: session.user.id,
      },
      select: orderSummarySelect,
    });

    await createAuditLog({
      actor: session.user,
      action: "PAYMENT_REVIEW_APPROVE",
      entityType: "ORDER",
      entityId: updated.id,
      entityLabel: `Pedido #${updated.orderNumber}`,
      summary: `Aprobo manualmente el pago del pedido #${updated.orderNumber}.`,
      request: req,
      metadata: {
        orderNumber: updated.orderNumber,
        previousPaymentStatus: existing.paymentStatus,
        nextPaymentStatus: updated.paymentStatus,
        previousPaymentReviewStatus: existing.paymentReviewStatus,
        nextPaymentReviewStatus: updated.paymentReviewStatus,
        reviewNote: parsed.data.reviewNote?.trim() || null,
      },
    });

    const approvalNotification = await Promise.allSettled([
      sendPaymentApprovedToCustomer({
        orderNumber: updated.orderNumber,
        customerName: existing.customerName,
        customerEmail: existing.customerEmail,
        reviewNote: parsed.data.reviewNote?.trim() || null,
      }),
    ]);

    approvalNotification.forEach((result) => {
      if (result.status !== "rejected") return;
      console.error("[admin-order-review] failed to send payment approval email", {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        error: result.reason instanceof Error ? result.reason.message : "unknown_error",
      });
    });

    return NextResponse.json({ data: updated });
  }

  if (parsed.data.action === "REJECT_PAYMENT_REVIEW") {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Solo ADMIN puede rechazar revisiones de pago." },
        { status: 403 },
      );
    }

    if (existing.paymentMethod === "IN_STORE") {
      return NextResponse.json(
        { error: "Los pagos en tienda fisica no requieren revision manual." },
        { status: 409 },
      );
    }

    if (!existing.paymentProofUrl && !existing.paymentReference) {
      return NextResponse.json(
        { error: "Este pedido no tiene comprobante ni referencia para rechazar." },
        { status: 409 },
      );
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "UNPAID",
        paymentReviewStatus: "REJECTED",
        paymentReviewNotes:
          parsed.data.reviewNote?.trim() || "Comprobante rechazado en revision manual.",
        paymentReviewedAt: new Date(),
        paymentReviewedByUserId: session.user.id,
      },
      select: orderSummarySelect,
    });

    await createAuditLog({
      actor: session.user,
      action: "PAYMENT_REVIEW_REJECT",
      entityType: "ORDER",
      entityId: updated.id,
      entityLabel: `Pedido #${updated.orderNumber}`,
      summary: `Rechazo la revision de pago del pedido #${updated.orderNumber}.`,
      request: req,
      metadata: {
        orderNumber: updated.orderNumber,
        previousPaymentStatus: existing.paymentStatus,
        nextPaymentStatus: updated.paymentStatus,
        previousPaymentReviewStatus: existing.paymentReviewStatus,
        nextPaymentReviewStatus: updated.paymentReviewStatus,
        reviewNote:
          parsed.data.reviewNote?.trim() || "Comprobante rechazado en revision manual.",
      },
    });

    const rejectionNotification = await Promise.allSettled([
      sendPaymentRejectedToCustomer({
        orderNumber: updated.orderNumber,
        customerName: existing.customerName,
        customerEmail: existing.customerEmail,
        reviewNote:
          parsed.data.reviewNote?.trim() || "Comprobante rechazado en revision manual.",
      }),
    ]);

    rejectionNotification.forEach((result) => {
      if (result.status !== "rejected") return;
      console.error("[admin-order-review] failed to send payment rejection email", {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        error: result.reason instanceof Error ? result.reason.message : "unknown_error",
      });
    });

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

        await createAuditLog({
          actor: session.user,
          action: "ASSIGN",
          entityType: "ORDER",
          entityId: updated.id,
          entityLabel: `Pedido #${updated.orderNumber}`,
          summary: `Tomo el pedido #${updated.orderNumber} desde el flujo de cocina.`,
          request: req,
          metadata: {
            orderNumber: updated.orderNumber,
            previousStatus: existing.status,
            nextStatus: updated.status,
            assignedPreparerId: updated.assignedPreparer?.id ?? session.user.id,
          },
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

      await createAuditLog({
        actor: session.user,
        action: "STATUS_CHANGE",
        entityType: "ORDER",
        entityId: updated.id,
        entityLabel: `Pedido #${updated.orderNumber}`,
        summary: `Marco el pedido #${updated.orderNumber} como READY.`,
        request: req,
        metadata: {
          orderNumber: updated.orderNumber,
          previousStatus: existing.status,
          nextStatus: updated.status,
        },
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

  const resultingStatus = parsed.data.status ?? existing.status;
  const resultingPaymentStatus = parsed.data.paymentStatus ?? existing.paymentStatus;

  if (parsed.data.status === "COMPLETED" && resultingPaymentStatus !== "PAID") {
    return NextResponse.json(
      { error: "No se puede completar un pedido sin marcarlo como pagado (PAID)." },
      { status: 409 },
    );
  }

  if (
    parsed.data.paymentStatus === "REFUNDED" &&
    resultingStatus !== "COMPLETED" &&
    resultingStatus !== "CANCELED"
  ) {
    return NextResponse.json(
      {
        error:
          "Solo se puede marcar REFUNDED en pedidos COMPLETED o CANCELED.",
      },
      { status: 409 },
    );
  }

  const shouldRestoreStock =
    parsed.data.status === "CANCELED" && existing.status !== "CANCELED";

  const updated = shouldRestoreStock
    ? await prisma.$transaction(async (tx) => {
        const productStockMap = new Map<string, number>();
        const variantStockMap = new Map<string, number>();
        for (const item of existing.items) {
          if (item.productVariantId) {
            variantStockMap.set(
              item.productVariantId,
              (variantStockMap.get(item.productVariantId) ?? 0) + item.quantity,
            );
            continue;
          }

          if (item.productId) {
            productStockMap.set(
              item.productId,
              (productStockMap.get(item.productId) ?? 0) + item.quantity,
            );
          }
        }

        const trackedProducts =
          productStockMap.size > 0
            ? await tx.product.findMany({
                where: {
                  id: { in: Array.from(productStockMap.keys()) },
                  trackStock: true,
                },
                select: {
                  id: true,
                },
              })
            : [];
        const trackedVariants =
          variantStockMap.size > 0
            ? await tx.productVariant.findMany({
                where: {
                  id: { in: Array.from(variantStockMap.keys()) },
                  trackStock: true,
                },
                select: {
                  id: true,
                },
              })
            : [];

        for (const product of trackedProducts) {
          const quantityToRestore = productStockMap.get(product.id) ?? 0;
          if (quantityToRestore <= 0) continue;

          await tx.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: {
                increment: quantityToRestore,
              },
            },
          });
        }

        for (const variant of trackedVariants) {
          const quantityToRestore = variantStockMap.get(variant.id) ?? 0;
          if (quantityToRestore <= 0) continue;

          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              stockQuantity: {
                increment: quantityToRestore,
              },
            },
          });
        }

        return tx.order.update({
          where: { id: orderId },
          data: {
            ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
            ...(parsed.data.paymentStatus !== undefined
              ? { paymentStatus: parsed.data.paymentStatus }
              : {}),
          },
          select: orderSummarySelect,
        });
      })
    : await prisma.order.update({
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

  await createAuditLog({
    actor: session.user,
    action: "STATUS_CHANGE",
    entityType: "ORDER",
    entityId: updated.id,
    entityLabel: `Pedido #${updated.orderNumber}`,
    summary: `Actualizo el pedido #${updated.orderNumber}.`,
    request: req,
    metadata: {
      orderNumber: updated.orderNumber,
      previousStatus: existing.status,
      nextStatus: updated.status,
      previousPaymentStatus: existing.paymentStatus,
      nextPaymentStatus: updated.paymentStatus,
      restoredStock: shouldRestoreStock,
    },
  });

  return NextResponse.json({ data: updated });
}
