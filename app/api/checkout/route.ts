import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { validateCheckoutCart } from "@/lib/checkout-validation";
import { publishKitchenEvent } from "@/lib/kitchen-events";
import { getStoreAvailability, getStoreSettings } from "@/lib/data/store-settings";
import { getPurchasableStock } from "@/lib/product-variants";
import {
  sendNewOrderInternalAlert,
  sendOrderConfirmationToCustomer,
} from "@/lib/notifications/order-notifications";
import { z } from "zod";

const GUEST_CART_COOKIE = "guest_cart_token";

const checkoutSchema = z
  .object({
    customerName: z.string().trim().min(2).max(120),
    customerPhone: z.string().trim().max(40).optional(),
    customerEmail: z.string().trim().email().optional(),
    fulfillmentType: z.enum(["PICKUP", "DELIVERY"]),
    notes: z.string().trim().max(1000).optional(),
    paymentMethod: z.enum(["MOBILE_PAYMENT", "BANK_TRANSFER", "IN_STORE"]),
    paymentReference: z.string().trim().max(120).optional(),
    paymentProofUrl: z.string().trim().url().max(500).optional(),
    paymentProofPath: z.string().trim().max(500).optional(),
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

    if (
      (value.paymentProofUrl && !value.paymentProofPath) ||
      (!value.paymentProofUrl && value.paymentProofPath)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payment proof must include url and storage path together.",
        path: ["paymentProofUrl"],
      });
    }

    if (
      (value.paymentMethod === "MOBILE_PAYMENT" ||
        value.paymentMethod === "BANK_TRANSFER") &&
      !value.paymentReference?.trim() &&
      !value.paymentProofUrl
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Manual payment requires a payment reference or uploaded proof.",
        path: ["paymentReference"],
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
            lineKey: true,
            productId: true,
            productVariantId: true,
            quantity: true,
            unitPriceCents: true,
            nameSnapshot: true,
            variantNameSnapshot: true,
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

    const productIds = Array.from(
      new Set(
        cart.items
          .map((item) => item.productId)
          .filter((productId): productId is string => Boolean(productId)),
      ),
    );
    const optionIds = Array.from(
      new Set(
        cart.items.flatMap((item) =>
          item.options
            .map((option) => option.optionId)
            .filter((optionId): optionId is string => Boolean(optionId)),
        ),
      ),
    );
    const variantIds = Array.from(
      new Set(
        cart.items
          .map((item) => item.productVariantId)
          .filter((variantId): variantId is string => Boolean(variantId)),
      ),
    );

    const [products, variants, options, productOptionGroups] = await Promise.all([
      prisma.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
        select: {
          id: true,
          basePriceCents: true,
          trackStock: true,
          stockQuantity: true,
          variants: {
            where: { isActive: true },
            select: {
              id: true,
            },
          },
        },
      }),
      variantIds.length > 0
        ? prisma.productVariant.findMany({
            where: {
              id: { in: variantIds },
              isActive: true,
            },
            select: {
              id: true,
              productId: true,
              name: true,
              priceDeltaCents: true,
              trackStock: true,
              stockQuantity: true,
            },
          })
        : Promise.resolve([]),
      optionIds.length > 0
        ? prisma.option.findMany({
            where: {
              id: { in: optionIds },
            },
            select: {
              id: true,
              groupId: true,
              priceDeltaCents: true,
              isActive: true,
              group: {
                select: {
                  isActive: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      prisma.productOptionGroup.findMany({
        where: {
          productId: { in: productIds },
        },
        select: {
          productId: true,
          groupId: true,
          group: {
            select: {
              minSelect: true,
              maxSelect: true,
              isActive: true,
            },
          },
        },
      }),
    ]);

    const checkoutItems = cart.items
      .filter((item): item is typeof item & { productId: string } => Boolean(item.productId))
      .map((item) => ({
        lineKey: item.lineKey,
        productId: item.productId,
        productVariantId: item.productVariantId ?? null,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        options: item.options
          .filter((option): option is typeof option & { optionId: string } => Boolean(option.optionId))
          .map((option) => ({
            optionId: option.optionId,
            quantity: option.quantity,
          })),
      }));

    if (checkoutItems.length !== cart.items.length) {
      return NextResponse.json(
        { error: "El carrito contiene productos invalidos. Actualiza e intenta de nuevo." },
        { status: 400 },
      );
    }

    const validation = validateCheckoutCart({
      items: checkoutItems,
      products,
      options: options.map((option) => ({
        id: option.id,
        groupId: option.groupId,
        priceDeltaCents: option.priceDeltaCents,
        isActive: option.isActive,
        groupIsActive: option.group.isActive,
      })),
      productGroupRules: productOptionGroups.map((relation) => ({
        productId: relation.productId,
        groupId: relation.groupId,
        minSelect: relation.group.minSelect,
        maxSelect: relation.group.maxSelect,
        isActive: relation.group.isActive,
      })),
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    for (const item of checkoutItems) {
      const product = products.find((entry) => entry.id === item.productId);
      if (!product) {
        return NextResponse.json(
          { error: "El carrito contiene productos inactivos o eliminados." },
          { status: 400 },
        );
      }

      if (product.variants.length > 0 && !item.productVariantId) {
        return NextResponse.json(
          { error: "Uno de los productos requiere elegir una variante antes de comprar." },
          { status: 400 },
        );
      }

      const variant = item.productVariantId
        ? variantById.get(item.productVariantId)
        : null;
      if (item.productVariantId && (!variant || variant.productId !== product.id)) {
        return NextResponse.json(
          { error: "El carrito contiene una variante invalida o inactiva." },
          { status: 400 },
        );
      }

      const availableStock = getPurchasableStock({
        product,
        variant,
      });
      if (availableStock < item.quantity) {
        return NextResponse.json(
          {
            error:
              availableStock <= 0
                ? "Uno de los productos de tu carrito se agoto antes de finalizar la compra."
                : "Uno de los productos ya no tiene suficiente stock para completar la cantidad solicitada.",
          },
          { status: 409 },
        );
      }
    }

    const subtotalCents = cart.items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );
    const taxCents = Math.round(subtotalCents * 0.1);
    const storeSettings = await getStoreSettings();
    const storeAvailability = getStoreAvailability(storeSettings);
    if (!storeAvailability.isAcceptingOrders) {
      return NextResponse.json(
        {
          error:
            storeAvailability.reason ??
            "La tienda no esta aceptando pedidos en este momento.",
        },
        { status: 409 },
      );
    }
    const deliveryFeeCents =
      parsed.data.fulfillmentType === "DELIVERY"
        ? subtotalCents >= storeSettings.freeDeliveryMinCents
          ? 0
          : storeSettings.deliveryFeeCents
        : 0;
    const totalCents = subtotalCents + taxCents + deliveryFeeCents;
    const paymentReviewStatus =
      parsed.data.paymentMethod === "IN_STORE" ? "NOT_REQUIRED" : "PENDING";
    const paymentReference =
      parsed.data.paymentMethod === "IN_STORE"
        ? null
        : parsed.data.paymentReference?.trim() || null;
    const paymentProofUrl =
      parsed.data.paymentMethod === "IN_STORE"
        ? null
        : parsed.data.paymentProofUrl?.trim() || null;
    const paymentProofPath =
      parsed.data.paymentMethod === "IN_STORE"
        ? null
        : parsed.data.paymentProofPath?.trim() || null;

    const order = await prisma.$transaction(async (tx) => {
      for (const item of checkoutItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            trackStock: true,
            stockQuantity: true,
          },
        });

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        const variant = item.productVariantId
          ? await tx.productVariant.findUnique({
              where: { id: item.productVariantId },
              select: {
                id: true,
                productId: true,
                trackStock: true,
                stockQuantity: true,
              },
            })
          : null;

        if (item.productVariantId && (!variant || variant.productId !== product.id)) {
          throw new Error("PRODUCT_VARIANT_NOT_FOUND");
        }

        const trackable = variant?.trackStock ? variant : product;
        if (trackable.trackStock) {
          if (trackable.stockQuantity < item.quantity) {
            throw new Error("INSUFFICIENT_STOCK");
          }

          if (variant?.trackStock) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          } else {
            await tx.product.update({
              where: { id: product.id },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          userId: cart.userId ?? null,
          status: "PENDING",
          fulfillmentType: parsed.data.fulfillmentType,
          paymentStatus: "UNPAID",
          paymentMethod: parsed.data.paymentMethod,
          paymentReviewStatus,
          paymentReference,
          paymentProofUrl,
          paymentProofPath,
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
              productVariantId: item.productVariantId,
              nameSnapshot: item.nameSnapshot,
              variantNameSnapshot: item.variantNameSnapshot,
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

    const customerName = parsed.data.customerName.trim();
    const customerPhone = parsed.data.customerPhone?.trim() || null;
    const customerEmail = parsed.data.customerEmail?.trim() || null;
    const itemsCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    const notificationResults = await Promise.allSettled([
      sendNewOrderInternalAlert({
        orderNumber: order.orderNumber,
        customerName,
        customerPhone,
        customerEmail,
        fulfillmentType: parsed.data.fulfillmentType,
        totalCents: order.totalCents,
        itemsCount,
        createdAt: order.createdAt,
      }),
      sendOrderConfirmationToCustomer({
        orderNumber: order.orderNumber,
        customerName,
        customerEmail,
        fulfillmentType: parsed.data.fulfillmentType,
        totalCents: order.totalCents,
        itemsCount,
      }),
    ]);

    notificationResults.forEach((result, index) => {
      if (result.status !== "rejected") return;

      console.error("[checkout] failed to send order notification", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        notificationType: index === 0 ? "internal_alert" : "customer_confirmation",
        error:
          result.reason instanceof Error ? result.reason.message : "unknown_error",
      });
    });

    const response = NextResponse.json({ data: order }, { status: 201 });

    publishKitchenEvent({
      type: "ORDER_CREATED",
      orderId: order.id,
      orderNumber: order.orderNumber,
    });

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
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          {
            error:
              "Uno de los productos ya no tiene suficiente stock para completar la compra.",
          },
          { status: 409 },
        );
      }

      if (error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Uno de los productos de tu carrito ya no esta disponible." },
          { status: 400 },
        );
      }

      if (error.message === "PRODUCT_VARIANT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Una de las variantes seleccionadas ya no esta disponible." },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ error: "Unable to complete checkout." }, { status: 500 });
  }
}
