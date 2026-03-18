import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import {
  DEFAULT_DELIVERY_FEE_CENTS,
  DEFAULT_FREE_DELIVERY_MIN_CENTS,
  STORE_SETTINGS_KEY,
  getStoreSettings,
} from "@/lib/data/store-settings";
import { z } from "zod";

const updateDeliverySettingsSchema = z.object({
  deliveryFeeCents: z.coerce.number().int().min(0).max(10_000_000),
  freeDeliveryMinCents: z.coerce.number().int().min(0).max(100_000_000),
  paymentMobileBank: z.string().trim().min(2).max(120),
  paymentMobilePhone: z.string().trim().min(3).max(40),
  paymentMobileId: z.string().trim().min(3).max(40),
  paymentTransferBank: z.string().trim().min(2).max(120),
  paymentTransferAccountType: z.string().trim().min(2).max(40),
  paymentTransferAccountNumber: z.string().trim().min(6).max(80),
  paymentTransferId: z.string().trim().min(3).max(40),
  paymentBeneficiaryName: z.string().trim().min(2).max(160),
});

function toResponseData(input: {
  deliveryFeeCents: number;
  freeDeliveryMinCents: number;
  paymentMobileBank: string | null;
  paymentMobilePhone: string | null;
  paymentMobileId: string | null;
  paymentTransferBank: string | null;
  paymentTransferAccountType: string | null;
  paymentTransferAccountNumber: string | null;
  paymentTransferId: string | null;
  paymentBeneficiaryName: string | null;
}) {
  return {
    deliveryFeeCents: input.deliveryFeeCents,
    freeDeliveryMinCents: input.freeDeliveryMinCents,
    paymentMobileBank: input.paymentMobileBank ?? "",
    paymentMobilePhone: input.paymentMobilePhone ?? "",
    paymentMobileId: input.paymentMobileId ?? "",
    paymentTransferBank: input.paymentTransferBank ?? "",
    paymentTransferAccountType: input.paymentTransferAccountType ?? "",
    paymentTransferAccountNumber: input.paymentTransferAccountNumber ?? "",
    paymentTransferId: input.paymentTransferId ?? "",
    paymentBeneficiaryName: input.paymentBeneficiaryName ?? "",
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await getStoreSettings();
  return NextResponse.json({ data: toResponseData(settings) });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateDeliverySettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const previous = await prisma.storeSettings.findUnique({
    where: { singletonKey: STORE_SETTINGS_KEY },
    select: {
      deliveryFeeCents: true,
      freeDeliveryMinCents: true,
      paymentMobileBank: true,
      paymentMobilePhone: true,
      paymentMobileId: true,
      paymentTransferBank: true,
      paymentTransferAccountType: true,
      paymentTransferAccountNumber: true,
      paymentTransferId: true,
      paymentBeneficiaryName: true,
    },
  });

  const saved = await prisma.storeSettings.upsert({
    where: { singletonKey: STORE_SETTINGS_KEY },
    update: {
      deliveryFeeCents: parsed.data.deliveryFeeCents,
      freeDeliveryMinCents: parsed.data.freeDeliveryMinCents,
      paymentMobileBank: parsed.data.paymentMobileBank,
      paymentMobilePhone: parsed.data.paymentMobilePhone,
      paymentMobileId: parsed.data.paymentMobileId,
      paymentTransferBank: parsed.data.paymentTransferBank,
      paymentTransferAccountType: parsed.data.paymentTransferAccountType,
      paymentTransferAccountNumber: parsed.data.paymentTransferAccountNumber,
      paymentTransferId: parsed.data.paymentTransferId,
      paymentBeneficiaryName: parsed.data.paymentBeneficiaryName,
    },
    create: {
      singletonKey: STORE_SETTINGS_KEY,
      deliveryFeeCents: parsed.data.deliveryFeeCents,
      freeDeliveryMinCents: parsed.data.freeDeliveryMinCents,
      paymentMobileBank: parsed.data.paymentMobileBank,
      paymentMobilePhone: parsed.data.paymentMobilePhone,
      paymentMobileId: parsed.data.paymentMobileId,
      paymentTransferBank: parsed.data.paymentTransferBank,
      paymentTransferAccountType: parsed.data.paymentTransferAccountType,
      paymentTransferAccountNumber: parsed.data.paymentTransferAccountNumber,
      paymentTransferId: parsed.data.paymentTransferId,
      paymentBeneficiaryName: parsed.data.paymentBeneficiaryName,
    },
    select: {
      deliveryFeeCents: true,
      freeDeliveryMinCents: true,
      paymentMobileBank: true,
      paymentMobilePhone: true,
      paymentMobileId: true,
      paymentTransferBank: true,
      paymentTransferAccountType: true,
      paymentTransferAccountNumber: true,
      paymentTransferId: true,
      paymentBeneficiaryName: true,
    },
  });

  await createAuditLog({
    actor: session.user,
    action: "UPDATE",
    entityType: "STORE_SETTINGS",
    entityId: STORE_SETTINGS_KEY,
    entityLabel: "Configuracion de tienda",
    summary: "Actualizo la configuracion de tienda y datos de pago del negocio.",
    request: req,
    metadata: {
      previous: previous ? toResponseData(previous) : toResponseData(await getStoreSettings()),
      next: toResponseData(saved),
    },
  });

  return NextResponse.json({ data: toResponseData(saved) });
}
