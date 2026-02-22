import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import type { CartItem } from "@/types/types";

const GUEST_CART_COOKIE = "guest_cart_token";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type ActiveCart = {
  id: string;
  guestToken: string | null;
};

function normalizeIncomingItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];

  const quantityByProduct = new Map<string, number>();

  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object") continue;

    const maybeId = (rawItem as { id?: unknown }).id;
    const maybeQuantity = (rawItem as { quantity?: unknown }).quantity;

    if (typeof maybeId !== "string" || maybeId.length === 0) continue;

    const numericQuantity = Number(maybeQuantity);
    const parsedQuantity = Number.isFinite(numericQuantity)
      ? Math.max(0, Math.floor(numericQuantity))
      : 0;

    if (parsedQuantity <= 0) continue;

    quantityByProduct.set(
      maybeId,
      (quantityByProduct.get(maybeId) ?? 0) + parsedQuantity,
    );
  }

  return Array.from(quantityByProduct.entries()).map(([id, quantity]) => ({
    id,
    quantity,
  }));
}

async function getOrCreateActiveCart(): Promise<{
  cart: ActiveCart;
  tokenToSet?: string;
}> {
  const session = await auth();
  const cookieStore = await cookies();

  if (session?.user?.id) {
    const existingUserCart = await prisma.cart.findFirst({
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
    });

    if (existingUserCart) {
      return { cart: existingUserCart };
    }

    const createdUserCart = await prisma.cart.create({
      data: {
        userId: session.user.id,
        status: "ACTIVE",
      },
      select: {
        id: true,
        guestToken: true,
      },
    });

    return { cart: createdUserCart };
  }

  const existingGuestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;

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
    select: {
      productId: true,
      quantity: true,
    },
  });

  return dbItems
    .filter((item) => item.productId)
    .map((item) => ({
      id: item.productId as string,
      quantity: item.quantity,
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

export async function GET() {
  try {
    const { cart, tokenToSet } = await getOrCreateActiveCart();
    const items = await readCartItems(cart.id);

    return jsonWithCookie({ items }, tokenToSet);
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

    const { cart, tokenToSet } = await getOrCreateActiveCart();

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    if (incomingItems.length > 0) {
      const products = await prisma.product.findMany({
        where: {
          id: {
            in: incomingItems.map((item) => item.id),
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          basePriceCents: true,
        },
      });

      const productById = new Map(products.map((product) => [product.id, product]));

      const rows = incomingItems
        .map((item) => {
          const product = productById.get(item.id);
          if (!product) return null;

          return {
            cartId: cart.id,
            productId: product.id,
            lineKey: product.id,
            quantity: item.quantity,
            unitPriceCents: product.basePriceCents,
            nameSnapshot: product.name,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (rows.length > 0) {
        await prisma.cartItem.createMany({
          data: rows,
        });
      }
    }

    const items = await readCartItems(cart.id);
    return jsonWithCookie({ items }, tokenToSet);
  } catch {
    return NextResponse.json({ error: "Unable to sync cart." }, { status: 500 });
  }
}
