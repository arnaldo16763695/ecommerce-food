import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getAvailableStock } from "@/lib/product-stock";
import type { CartItem, CartItemOption } from "@/types/types";

const GUEST_CART_COOKIE = "guest_cart_token";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type ActiveCart = {
  id: string;
  guestToken: string | null;
};

type NormalizedCartItemInput = {
  lineKey: string;
  productId: string;
  quantity: number;
  notes?: string;
  options: Array<{ optionId: string }>;
};

function normalizeIncomingItems(items: unknown): NormalizedCartItemInput[] {
  if (!Array.isArray(items)) return [];

  const map = new Map<string, NormalizedCartItemInput>();

  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object") continue;

    const maybeId = (rawItem as { id?: unknown }).id;
    const maybeLineKey = (rawItem as { lineKey?: unknown }).lineKey;
    const maybeProductId = (rawItem as { productId?: unknown }).productId;
    const maybeQuantity = (rawItem as { quantity?: unknown }).quantity;
    const maybeNotes = (rawItem as { notes?: unknown }).notes;
    const maybeOptions = (rawItem as { options?: unknown }).options;

    const productId =
      typeof maybeProductId === "string" && maybeProductId.length > 0
        ? maybeProductId
        : typeof maybeId === "string"
          ? maybeId
          : "";

    if (!productId) continue;

    const numericQuantity = Number(maybeQuantity);
    const quantity = Number.isFinite(numericQuantity)
      ? Math.max(0, Math.floor(numericQuantity))
      : 0;

    if (quantity <= 0) continue;

    const lineKey =
      typeof maybeLineKey === "string" && maybeLineKey.length > 0
        ? maybeLineKey
        : typeof maybeId === "string" && maybeId.length > 0
          ? maybeId
          : productId;

    const parsedOptions = Array.isArray(maybeOptions)
      ? maybeOptions
          .map((option) => {
            if (!option || typeof option !== "object") return null;
            const optionId = (option as { optionId?: unknown }).optionId;
            if (typeof optionId !== "string" || optionId.length === 0) return null;
            return { optionId };
          })
          .filter(
            (option): option is { optionId: string } => option !== null,
          )
      : [];

    const existing = map.get(lineKey);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }

    map.set(lineKey, {
      lineKey,
      productId,
      quantity,
      notes:
        typeof maybeNotes === "string" && maybeNotes.trim().length > 0
          ? maybeNotes.trim()
          : undefined,
      options: parsedOptions,
    });
  }

  return Array.from(map.values());
}

async function getOrCreateActiveCart(): Promise<{
  cart: ActiveCart;
  tokenToSet?: string;
  clearGuestToken?: boolean;
}> {
  const session = await auth();
  const cookieStore = await cookies();
  const existingGuestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;

  if (session?.user?.id) {
    const userCart =
      (await prisma.cart.findFirst({
        where: {
          userId: session.user.id,
          status: "ACTIVE",
        },
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          guestToken: true,
        },
      })) ??
      (await prisma.cart.create({
        data: {
          userId: session.user.id,
          status: "ACTIVE",
        },
        select: {
          id: true,
          guestToken: true,
        },
      }));

    if (!existingGuestToken) {
      return { cart: userCart };
    }

    const guestCart = await prisma.cart.findFirst({
      where: {
        status: "ACTIVE",
        guestToken: existingGuestToken,
      },
      select: {
        id: true,
      },
    });

    if (!guestCart || guestCart.id === userCart.id) {
      return { cart: userCart, clearGuestToken: true };
    }

    await prisma.$transaction(async (tx) => {
      const guestItems = await tx.cartItem.findMany({
        where: { cartId: guestCart.id },
        include: {
          options: true,
        },
      });

      for (const guestItem of guestItems) {
        const existingUserItem = await tx.cartItem.findFirst({
          where: {
            cartId: userCart.id,
            lineKey: guestItem.lineKey,
          },
          select: {
            id: true,
            quantity: true,
          },
        });

        if (existingUserItem) {
          await tx.cartItem.update({
            where: { id: existingUserItem.id },
            data: {
              quantity: existingUserItem.quantity + guestItem.quantity,
            },
          });
          continue;
        }

        await tx.cartItem.create({
          data: {
            cartId: userCart.id,
            productId: guestItem.productId,
            lineKey: guestItem.lineKey,
            quantity: guestItem.quantity,
            unitPriceCents: guestItem.unitPriceCents,
            nameSnapshot: guestItem.nameSnapshot,
            notes: guestItem.notes,
            options: {
              create: guestItem.options.map((option) => ({
                optionId: option.optionId,
                groupNameSnapshot: option.groupNameSnapshot,
                optionNameSnapshot: option.optionNameSnapshot,
                priceDeltaCents: option.priceDeltaCents,
                quantity: option.quantity,
              })),
            },
          },
        });
      }

      await tx.cart.delete({
        where: { id: guestCart.id },
      });
    });

    return { cart: userCart, clearGuestToken: true };
  }

  if (existingGuestToken) {
    const existingCart = await prisma.cart.findFirst({
      where: {
        status: "ACTIVE",
        guestToken: existingGuestToken,
      },
      select: {
        id: true,
        guestToken: true,
      },
    });

    if (existingCart) {
      return { cart: existingCart };
    }
  }

  const nextGuestToken = existingGuestToken ?? randomUUID();

  const createdCart = await prisma.cart.create({
    data: {
      status: "ACTIVE",
      guestToken: nextGuestToken,
    },
    select: {
      id: true,
      guestToken: true,
    },
  });

  return {
    cart: createdCart,
    tokenToSet: existingGuestToken ? undefined : nextGuestToken,
  };
}

async function readCartItems(cartId: string): Promise<CartItem[]> {
  const dbItems = await prisma.cartItem.findMany({
    where: { cartId },
    orderBy: { createdAt: "asc" },
    select: {
      lineKey: true,
      productId: true,
      nameSnapshot: true,
      quantity: true,
      unitPriceCents: true,
      notes: true,
      options: {
        select: {
          optionId: true,
          groupNameSnapshot: true,
          optionNameSnapshot: true,
          priceDeltaCents: true,
        },
      },
    },
  });

  return dbItems
    .filter((item) => item.productId)
    .map((item) => ({
      id: item.lineKey,
      productId: item.productId as string,
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      notes: item.notes ?? undefined,
      options: item.options
        .filter((option) => option.optionId)
        .map(
          (option): CartItemOption => ({
            optionId: option.optionId as string,
            groupName: option.groupNameSnapshot,
            optionName: option.optionNameSnapshot,
            priceDeltaCents: option.priceDeltaCents,
          }),
        ),
    }));
}

function jsonWithCookie(body: unknown, tokenToSet?: string) {
  const response = NextResponse.json(body);

  if (tokenToSet) {
    response.cookies.set({
      name: GUEST_CART_COOKIE,
      value: tokenToSet,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: CART_COOKIE_MAX_AGE,
    });
  }

  return response;
}

function jsonWithCartCookies(params: {
  body: unknown;
  tokenToSet?: string;
  clearGuestToken?: boolean;
}) {
  const response = jsonWithCookie(params.body, params.tokenToSet);

  if (params.clearGuestToken) {
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
}

export async function GET() {
  try {
    const { cart, tokenToSet, clearGuestToken } = await getOrCreateActiveCart();
    const items = await readCartItems(cart.id);

    return jsonWithCartCookies({
      body: { items },
      tokenToSet,
      clearGuestToken,
    });
  } catch {
    return NextResponse.json({ error: "Unable to load cart." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const incomingItems = normalizeIncomingItems(
      (body as { items?: unknown })?.items,
    );

    const { cart, tokenToSet, clearGuestToken } = await getOrCreateActiveCart();

    const productIds = Array.from(
      new Set(incomingItems.map((item) => item.productId)),
    );
    const optionIds = Array.from(
      new Set(
        incomingItems.flatMap((item) =>
          item.options.map((option) => option.optionId),
        ),
      ),
    );

    const [products, options] = await Promise.all([
      prisma.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          basePriceCents: true,
          trackStock: true,
          stockQuantity: true,
        },
      }),
      optionIds.length > 0
        ? prisma.option.findMany({
            where: {
              id: { in: optionIds },
              isActive: true,
            },
            select: {
              id: true,
              name: true,
              priceDeltaCents: true,
              group: {
                select: {
                  name: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const productById = new Map(products.map((product) => [product.id, product]));
    const optionById = new Map(options.map((option) => [option.id, option]));

    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      for (const incoming of incomingItems) {
        const product = productById.get(incoming.productId);
        if (!product) continue;
        const maxQuantity = getAvailableStock(product);
        const quantity = Math.min(incoming.quantity, maxQuantity);
        if (quantity <= 0) continue;

        const validOptions = incoming.options
          .map((option) => optionById.get(option.optionId))
          .filter((option): option is NonNullable<typeof option> => Boolean(option));

        const optionDelta = validOptions.reduce(
          (sum, option) => sum + option.priceDeltaCents,
          0,
        );

        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            lineKey: incoming.lineKey,
            quantity,
            unitPriceCents: product.basePriceCents + optionDelta,
            nameSnapshot: product.name,
            notes: incoming.notes,
            options: {
              create: validOptions.map((option) => ({
                optionId: option.id,
                groupNameSnapshot: option.group.name,
                optionNameSnapshot: option.name,
                priceDeltaCents: option.priceDeltaCents,
              })),
            },
          },
        });
      }
    });

    const items = await readCartItems(cart.id);
    return jsonWithCartCookies({
      body: { items },
      tokenToSet,
      clearGuestToken,
    });
  } catch {
    return NextResponse.json({ error: "Unable to sync cart." }, { status: 500 });
  }
}
