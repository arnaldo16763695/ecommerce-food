import "server-only";
import prisma from "@/lib/prisma";

export const DEFAULT_DELIVERY_FEE_CENTS = 1000;
export const DEFAULT_FREE_DELIVERY_MIN_CENTS = 10_000;
export const STORE_SETTINGS_KEY = "default";
export const DEFAULT_STORE_CLOSED_MESSAGE =
  "La tienda no esta aceptando pedidos en este momento.";

export type DeliverySettings = {
  deliveryFeeCents: number;
  freeDeliveryMinCents: number;
};

export type PaymentBusinessSettings = {
  paymentMobileBank: string;
  paymentMobilePhone: string;
  paymentMobileId: string;
  paymentTransferBank: string;
  paymentTransferAccountType: string;
  paymentTransferAccountNumber: string;
  paymentTransferId: string;
  paymentBeneficiaryName: string;
};

export type StoreOperationalSettings = {
  isStoreOpen: boolean;
  storeStatusMessage: string;
  storeStatusChangedAt: Date | null;
};

export type StoreSettings = DeliverySettings &
  PaymentBusinessSettings &
  StoreOperationalSettings;

function valueOrFallback(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function envPaymentDefaults(): PaymentBusinessSettings {
  return {
    paymentMobileBank: valueOrFallback(process.env.PAYMENT_MOBILE_BANK, "Por configurar"),
    paymentMobilePhone: valueOrFallback(process.env.PAYMENT_MOBILE_PHONE, "Por configurar"),
    paymentMobileId: valueOrFallback(process.env.PAYMENT_MOBILE_ID, "Por configurar"),
    paymentTransferBank: valueOrFallback(process.env.PAYMENT_TRANSFER_BANK, "Por configurar"),
    paymentTransferAccountType: valueOrFallback(
      process.env.PAYMENT_TRANSFER_ACCOUNT_TYPE,
      "Por configurar",
    ),
    paymentTransferAccountNumber: valueOrFallback(
      process.env.PAYMENT_TRANSFER_ACCOUNT_NUMBER,
      "Por configurar",
    ),
    paymentTransferId: valueOrFallback(
      process.env.PAYMENT_TRANSFER_ID,
      "Por configurar",
    ),
    paymentBeneficiaryName: valueOrFallback(
      process.env.PAYMENT_BENEFICIARY_NAME,
      "Por configurar",
    ),
  };
}

function defaultStoreStatusMessage() {
  return valueOrFallback(
    process.env.STORE_CLOSED_MESSAGE,
    DEFAULT_STORE_CLOSED_MESSAGE,
  );
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const settings = await getStoreSettings();

  return {
    deliveryFeeCents: settings.deliveryFeeCents,
    freeDeliveryMinCents: settings.freeDeliveryMinCents,
  };
}

export async function getStoreOperationalSettings(): Promise<StoreOperationalSettings> {
  const settings = await getStoreSettings();

  return {
    isStoreOpen: settings.isStoreOpen,
    storeStatusMessage: settings.storeStatusMessage,
    storeStatusChangedAt: settings.storeStatusChangedAt,
  };
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const row = await prisma.storeSettings
    .findUnique({
      where: { singletonKey: STORE_SETTINGS_KEY },
      select: {
        deliveryFeeCents: true,
        freeDeliveryMinCents: true,
        isStoreOpen: true,
        storeStatusMessage: true,
        storeStatusChangedAt: true,
        paymentMobileBank: true,
        paymentMobilePhone: true,
        paymentMobileId: true,
        paymentTransferBank: true,
        paymentTransferAccountType: true,
        paymentTransferAccountNumber: true,
        paymentTransferId: true,
        paymentBeneficiaryName: true,
      },
    })
    .catch(() => null);

  const paymentDefaults = envPaymentDefaults();
  const closedMessage = defaultStoreStatusMessage();

  if (!row) {
    return {
      deliveryFeeCents: DEFAULT_DELIVERY_FEE_CENTS,
      freeDeliveryMinCents: DEFAULT_FREE_DELIVERY_MIN_CENTS,
      isStoreOpen: false,
      storeStatusMessage: closedMessage,
      storeStatusChangedAt: null,
      ...paymentDefaults,
    };
  }

  return {
    deliveryFeeCents: row.deliveryFeeCents,
    freeDeliveryMinCents: row.freeDeliveryMinCents,
    isStoreOpen: row.isStoreOpen,
    storeStatusMessage: valueOrFallback(row.storeStatusMessage, closedMessage),
    storeStatusChangedAt: row.storeStatusChangedAt,
    paymentMobileBank: valueOrFallback(row.paymentMobileBank, paymentDefaults.paymentMobileBank),
    paymentMobilePhone: valueOrFallback(
      row.paymentMobilePhone,
      paymentDefaults.paymentMobilePhone,
    ),
    paymentMobileId: valueOrFallback(row.paymentMobileId, paymentDefaults.paymentMobileId),
    paymentTransferBank: valueOrFallback(
      row.paymentTransferBank,
      paymentDefaults.paymentTransferBank,
    ),
    paymentTransferAccountType: valueOrFallback(
      row.paymentTransferAccountType,
      paymentDefaults.paymentTransferAccountType,
    ),
    paymentTransferAccountNumber: valueOrFallback(
      row.paymentTransferAccountNumber,
      paymentDefaults.paymentTransferAccountNumber,
    ),
    paymentTransferId: valueOrFallback(
      row.paymentTransferId,
      paymentDefaults.paymentTransferId,
    ),
    paymentBeneficiaryName: valueOrFallback(
      row.paymentBeneficiaryName,
      paymentDefaults.paymentBeneficiaryName,
    ),
  };
}
