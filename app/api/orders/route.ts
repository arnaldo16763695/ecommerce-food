import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const lookupSchema = z.object({
  orderNumber: z.coerce.number().int().positive().optional(),
  contact: z.string().trim().min(3).max(120).optional(),
});

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const body = await req.json().catch(() => null);
    const parsed = lookupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos de consulta invalidos." }, { status: 400 });
    }

    const orderNumber = parsed.data.orderNumber;
    const contact = parsed.data.contact?.trim();

    if (!session?.user?.id && (!orderNumber || !contact)) {
      return NextResponse.json(
        { error: "Debes indicar numero de pedido y un contacto (email o telefono)." },
        { status: 400 },
      );
    }

    const orders = await prisma.order.findMany({
      where: session?.user?.id
        ? orderNumber
          ? {
              userId: session.user.id,
              orderNumber,
            }
          : {
              userId: session.user.id,
            }
        : {
            orderNumber: orderNumber!,
            OR: [
              { customerEmail: contact?.toLowerCase() ?? "" },
              { customerPhone: contact ?? "" },
              { customerPhone: normalizePhone(contact ?? "") },
            ],
          },
      orderBy: { createdAt: "desc" },
      take: session?.user?.id && !orderNumber ? 20 : 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        fulfillmentType: true,
        customerName: true,
        totalCents: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: orders });
  } catch {
    return NextResponse.json({ error: "No se pudo consultar pedidos." }, { status: 500 });
  }
}
