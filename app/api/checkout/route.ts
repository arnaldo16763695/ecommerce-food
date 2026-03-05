import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const GUEST_CART_COOKIE = "guest_cart_token";

const checkoutSchema = z
  .object({
    customerName: z.string().trim().min(2).max(120),
    customerPhone: z.string().trim().max(40).optional(),
    customerEmail: z.string().trim().email().optional(),
    fulfillmentType: z.enum(["PICKUP", "DELIVERY"]),
    notes: z.string().trim().max(1000).optional(),
    deliveryAddress: z
      .object({
        address1: z.string().trim().min(3).max(200),
        address2: z.string().trim().max(200).optional(),
        city: z.string().trim().max(120).optional(),
        notes: z.string().trim().max(500).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.customerPhone?.trim() && !value.customerEmail?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one contact field is required (phone or email).",
        path: ["customerPhone"],
      });
    }

    if (value.fulfillmentType === "DELIVERY" && !value.deliveryAddress?.address1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Delivery address is required for DELIVERY.",
        path: ["deliveryAddress", "address1"],
      });
    }
  });

async function getActiveCartIdForCheckout() {
  const session = await auth();
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;

  if (session?.user?.id) {
    const userCart = await prisma.cart.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    return { cartId: userCart?.id ?? null, isGuest: false };
  }

  if (!guestToken) return { cartId: null, isGuest: true };

  const guestCart = await prisma.cart.findFirst({
    where: {
      guestToken,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return { cartId: guestCart?.id ?? null, isGuest: true };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const { cartId, isGuest } = await getActiveCartIdForCheckout();
    if (!cartId) {
      return NextResponse.json({ error: "No active cart found." }, { status: 400 });
    }

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      select: {
        id: true,
        userId: true,
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            productId: true,
            quantity: true,
            unitPriceCents: true,
            nameSnapshot: true,
            notes: true,
            options: {
              select: {
                optionId: true,
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

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    const subtotalCents = cart.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );
    const taxCents = Math.round(subtotalCents * 0.1);
    const deliveryFeeCents =
      parsed.data.fulfillmentType === "DELIVERY"
        ? subtotalCents >= 10_000
          ? 0
          : 1_000
        : 0;
    const totalCents = subtotalCents + taxCents + deliveryFeeCents;

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: cart.userId ?? null,
          status: "PENDING",
          fulfillmentType: parsed.data.fulfillmentType,
          paymentStatus: "UNPAID",
          customerName: parsed.data.customerName.trim(),
          customerPhone: parsed.data.customerPhone?.trim() || null,
          customerEmail: parsed.data.customerEmail?.trim() || null,
          notes: parsed.data.notes?.trim() || null,
          subtotalCents,
          taxCents,
          deliveryFeeCents,
          totalCents,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              nameSnapshot: item.nameSnapshot,
              unitPriceCents: item.unitPriceCents,
              quantity: item.quantity,
              notes: item.notes,
              options: {
                create: item.options.map((option) => ({
                  optionId: option.optionId,
                  groupNameSnapshot: option.groupNameSnapshot,
                  optionNameSnapshot: option.optionNameSnapshot,
                  priceDeltaCents: option.priceDeltaCents,
                  quantity: option.quantity,
                })),
              },
            })),
          },
          ...(parsed.data.fulfillmentType === "DELIVERY" && parsed.data.deliveryAddress
            ? {
                address: {
                  create: {
                    address1: parsed.data.deliveryAddress.address1.trim(),
                    address2: parsed.data.deliveryAddress.address2?.trim() || null,
                    city: parsed.data.deliveryAddress.city?.trim() || null,
                    notes: parsed.data.deliveryAddress.notes?.trim() || null,
                  },
                },
              }
            : {}),
        },
        select: {
          id: true,
          orderNumber: true,
          totalCents: true,
          fulfillmentType: true,
          createdAt: true,
        },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: "CHECKED_OUT" },
      });

      return createdOrder;
    });

    const response = NextResponse.json({ data: order }, { status: 201 });

    if (isGuest) {
      response.cookies.set({
        name: GUEST_CART_COOKIE,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Unable to complete checkout." }, { status: 500 });
  }
}
