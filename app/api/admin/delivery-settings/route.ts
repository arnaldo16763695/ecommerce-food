import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import {
  STORE_SETTINGS_KEY,
  getDefaultOperatingHours,
  getStoreAvailability,
  getStoreSettings,
} from "@/lib/data/store-settings";
import { z } from "zod";

const operatingHourSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    isEnabled: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.isEnabled && value.opensAt >= value.closesAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La hora de cierre debe ser posterior a la de apertura.",
        path: ["closesAt"],
      });
    }
  });

const updateDeliverySettingsSchema = z.object({
  deliveryFeeCents: z.coerce.number().int().min(0).max(10_000_000),
  freeDeliveryMinCents: z.coerce.number().int().min(0).max(100_000_000),
  isStoreOpen: z.coerce.boolean(),
  storeStatusMessage: z.string().trim().min(5).max(250),
  paymentMobileBank: z.string().trim().min(2).max(120),
  paymentMobilePhone: z.string().trim().min(3).max(40),
  paymentMobileId: z.string().trim().min(3).max(40),
  paymentTransferBank: z.string().trim().min(2).max(120),
  paymentTransferAccountType: z.string().trim().min(2).max(40),
  paymentTransferAccountNumber: z.string().trim().min(6).max(80),
  paymentTransferId: z.string().trim().min(3).max(40),
  paymentBeneficiaryName: z.string().trim().min(2).max(160),
  operatingHours: z.array(operatingHourSchema).length(7),
}).superRefine((value, ctx) => {
  const uniqueDays = new Set(value.operatingHours.map((hour) => hour.dayOfWeek));
  if (uniqueDays.size !== 7) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debes enviar la configuracion completa de los siete dias.",
      path: ["operatingHours"],
    });
  }
});

function toResponseData(input: {
  deliveryFeeCents: number;
  freeDeliveryMinCents: number;
  isStoreOpen: boolean;
  storeStatusMessage: string | null;
  storeStatusChangedAt: Date | null;
  operatingHoursConfigured?: boolean;
  operatingHours?: Array<{
    dayOfWeek: number;
    opensAt: string;
    closesAt: string;
    isEnabled: boolean;
  }>;
  paymentMobileBank: string | null;
  paymentMobilePhone: string | null;
  paymentMobileId: string | null;
  paymentTransferBank: string | null;
  paymentTransferAccountType: string | null;
  paymentTransferAccountNumber: string | null;
  paymentTransferId: string | null;
  paymentBeneficiaryName: string | null;
}) {
  const availability = getStoreAvailability({
    isStoreOpen: input.isStoreOpen,
    storeStatusMessage: input.storeStatusMessage ?? "",
    storeStatusChangedAt: input.storeStatusChangedAt,
    operatingHoursConfigured:
      input.operatingHoursConfigured ?? Boolean(input.operatingHours?.length),
    operatingHours: input.operatingHours ?? getDefaultOperatingHours(),
  });

  return {
    deliveryFeeCents: input.deliveryFeeCents,
    freeDeliveryMinCents: input.freeDeliveryMinCents,
    isStoreOpen: input.isStoreOpen,
    storeStatusMessage: input.storeStatusMessage ?? "",
    storeStatusChangedAt: input.storeStatusChangedAt?.toISOString() ?? null,
    operatingHoursConfigured:
      input.operatingHoursConfigured ?? Boolean(input.operatingHours?.length),
    operatingHours: input.operatingHours ?? getDefaultOperatingHours(),
    isAcceptingOrdersNow: availability.isAcceptingOrders,
    availabilityReason: availability.reason,
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
      isStoreOpen: true,
      storeStatusMessage: true,
      storeStatusChangedAt: true,
      operatingHours: {
        select: {
          dayOfWeek: true,
          opensAt: true,
          closesAt: true,
          isEnabled: true,
        },
      },
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

  const saved = await prisma.$transaction(async (tx) => {
    const storeSettings = await tx.storeSettings.upsert({
      where: { singletonKey: STORE_SETTINGS_KEY },
      update: {
        deliveryFeeCents: parsed.data.deliveryFeeCents,
        freeDeliveryMinCents: parsed.data.freeDeliveryMinCents,
        isStoreOpen: parsed.data.isStoreOpen,
        storeStatusMessage: parsed.data.storeStatusMessage,
        storeStatusChangedAt: new Date(),
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
        isStoreOpen: parsed.data.isStoreOpen,
        storeStatusMessage: parsed.data.storeStatusMessage,
        storeStatusChangedAt: new Date(),
        paymentMobileBank: parsed.data.paymentMobileBank,
        paymentMobilePhone: parsed.data.paymentMobilePhone,
        paymentMobileId: parsed.data.paymentMobileId,
        paymentTransferBank: parsed.data.paymentTransferBank,
        paymentTransferAccountType: parsed.data.paymentTransferAccountType,
        paymentTransferAccountNumber: parsed.data.paymentTransferAccountNumber,
        paymentTransferId: parsed.data.paymentTransferId,
        paymentBeneficiaryName: parsed.data.paymentBeneficiaryName,
      },
      select: { id: true },
    });

    await tx.storeOperatingHour.deleteMany({
      where: { storeSettingsId: storeSettings.id },
    });

    await tx.storeOperatingHour.createMany({
      data: parsed.data.operatingHours.map((hour) => ({
        storeSettingsId: storeSettings.id,
        dayOfWeek: hour.dayOfWeek,
        opensAt: hour.opensAt,
        closesAt: hour.closesAt,
        isEnabled: hour.isEnabled,
      })),
    });

    return tx.storeSettings.findUniqueOrThrow({
      where: { singletonKey: STORE_SETTINGS_KEY },
      select: {
        deliveryFeeCents: true,
        freeDeliveryMinCents: true,
        isStoreOpen: true,
        storeStatusMessage: true,
        storeStatusChangedAt: true,
        operatingHours: {
          select: {
            dayOfWeek: true,
            opensAt: true,
            closesAt: true,
            isEnabled: true,
          },
        },
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
  });

  const previousStoreOpen = previous?.isStoreOpen ?? false;
  const storeStatusChanged = previousStoreOpen !== parsed.data.isStoreOpen;
  const auditAction = storeStatusChanged
    ? parsed.data.isStoreOpen
      ? "STORE_OPENED"
      : "STORE_CLOSED"
    : "UPDATE";
  const auditSummary = storeStatusChanged
    ? parsed.data.isStoreOpen
      ? "Abre la tienda para aceptar pedidos."
      : "Cierra la tienda para detener nuevos pedidos."
    : "Actualizo la configuracion de tienda y datos de pago del negocio.";

  await createAuditLog({
    actor: session.user,
    action: auditAction,
    entityType: "STORE_SETTINGS",
    entityId: STORE_SETTINGS_KEY,
    entityLabel: "Configuracion de tienda",
    summary: auditSummary,
    request: req,
    metadata: {
      previous: previous ? toResponseData(previous) : toResponseData(await getStoreSettings()),
      next: toResponseData(saved),
    },
  });

  return NextResponse.json({ data: toResponseData(saved) });
}
