import "server-only";

import prisma from "@/lib/prisma";

export const DEFAULT_DELIVERY_FEE_CENTS = 1000;
export const DEFAULT_FREE_DELIVERY_MIN_CENTS = 10_000;
export const STORE_SETTINGS_KEY = "default";
export const DEFAULT_STORE_CLOSED_MESSAGE =
  "La tienda no esta aceptando pedidos en este momento.";
export const STORE_TIMEZONE =
  process.env.STORE_TIMEZONE?.trim() || "America/Caracas";

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
  operatingHoursConfigured: boolean;
  operatingHours: StoreOperatingHourInput[];
};

export type StoreSettings = DeliverySettings &
  PaymentBusinessSettings &
  StoreOperationalSettings;

export type StoreOperatingHourInput = {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isEnabled: boolean;
};

export type StoreAvailability = {
  isAcceptingOrders: boolean;
  reason: string | null;
  scheduleConfigured: boolean;
  currentTime: string;
  todayDateKey: string;
  todayOperatingHour: StoreOperatingHourInput | null;
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

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

export function getDefaultOperatingHours(): StoreOperatingHourInput[] {
  return DAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    opensAt: "08:00",
    closesAt: "20:00",
    isEnabled: false,
  }));
}

function sortOperatingHours(hours: StoreOperatingHourInput[]) {
  return [...hours].sort(
    (left, right) =>
      DAY_ORDER.indexOf(left.dayOfWeek) - DAY_ORDER.indexOf(right.dayOfWeek),
  );
}

function weekdayToNumber(weekday: string) {
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}

function getLocalDateContext(date: Date, timeZone = STORE_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const weekday = getPart("weekday");

  return {
    dayOfWeek: weekdayToNumber(weekday),
    dateKey: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

function isOpenFlagValidForToday(
  changedAt: Date | null,
  todayDateKey: string,
  timeZone = STORE_TIMEZONE,
) {
  if (!changedAt) return false;
  return getLocalDateContext(changedAt, timeZone).dateKey === todayDateKey;
}

function formatShortTime(value: string) {
  const [hours, minutes] = value.split(":");
  const hoursNumber = Number(hours);
  if (!Number.isFinite(hoursNumber)) return value;

  const period = hoursNumber >= 12 ? "PM" : "AM";
  const displayHour = hoursNumber % 12 === 0 ? 12 : hoursNumber % 12;
  return `${displayHour}:${minutes} ${period}`;
}

export function getStoreAvailability(
  settings: Pick<
    StoreSettings,
    | "isStoreOpen"
    | "storeStatusMessage"
    | "storeStatusChangedAt"
    | "operatingHoursConfigured"
    | "operatingHours"
  >,
  now = new Date(),
) : StoreAvailability {
  const localNow = getLocalDateContext(now);
  const todayOperatingHour =
    settings.operatingHours.find(
      (hour) => hour.dayOfWeek === localNow.dayOfWeek && hour.isEnabled,
    ) ?? null;

  if (settings.operatingHoursConfigured) {
    if (!todayOperatingHour) {
      return {
        isAcceptingOrders: false,
        reason: "La tienda no esta operativa hoy.",
        scheduleConfigured: true,
        currentTime: localNow.time,
        todayDateKey: localNow.dateKey,
        todayOperatingHour: null,
      };
    }

    if (localNow.time < todayOperatingHour.opensAt) {
      return {
        isAcceptingOrders: false,
        reason: `La tienda abre hoy a las ${formatShortTime(todayOperatingHour.opensAt)}.`,
        scheduleConfigured: true,
        currentTime: localNow.time,
        todayDateKey: localNow.dateKey,
        todayOperatingHour,
      };
    }

    if (localNow.time >= todayOperatingHour.closesAt) {
      return {
        isAcceptingOrders: false,
        reason: `La tienda ya cerro por hoy. El horario de atencion termina a las ${formatShortTime(todayOperatingHour.closesAt)}.`,
        scheduleConfigured: true,
        currentTime: localNow.time,
        todayDateKey: localNow.dateKey,
        todayOperatingHour,
      };
    }

    if (
      !settings.isStoreOpen ||
      !isOpenFlagValidForToday(settings.storeStatusChangedAt, localNow.dateKey)
    ) {
      return {
        isAcceptingOrders: false,
        reason: settings.storeStatusMessage,
        scheduleConfigured: true,
        currentTime: localNow.time,
        todayDateKey: localNow.dateKey,
        todayOperatingHour,
      };
    }
  } else if (!settings.isStoreOpen) {
    return {
      isAcceptingOrders: false,
      reason: settings.storeStatusMessage,
      scheduleConfigured: false,
      currentTime: localNow.time,
      todayDateKey: localNow.dateKey,
      todayOperatingHour: null,
    };
  }

  return {
    isAcceptingOrders: true,
    reason: null,
    scheduleConfigured: settings.operatingHoursConfigured,
    currentTime: localNow.time,
    todayDateKey: localNow.dateKey,
    todayOperatingHour,
  };
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
    operatingHoursConfigured: settings.operatingHoursConfigured,
    operatingHours: settings.operatingHours,
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
        operatingHours: {
          select: {
            dayOfWeek: true,
            opensAt: true,
            closesAt: true,
            isEnabled: true,
          },
        },
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
      operatingHoursConfigured: false,
      operatingHours: getDefaultOperatingHours(),
      ...paymentDefaults,
    };
  }

  const configuredHours = sortOperatingHours(
    row.operatingHours.map((hour) => ({
      dayOfWeek: hour.dayOfWeek,
      opensAt: hour.opensAt,
      closesAt: hour.closesAt,
      isEnabled: hour.isEnabled,
    })),
  );

  const defaultHours = getDefaultOperatingHours();
  const mergedOperatingHours = defaultHours.map((defaultHour) => {
    const configured =
      configuredHours.find((hour) => hour.dayOfWeek === defaultHour.dayOfWeek) ??
      null;

    return configured ?? defaultHour;
  });

  return {
    deliveryFeeCents: row.deliveryFeeCents,
    freeDeliveryMinCents: row.freeDeliveryMinCents,
    isStoreOpen: row.isStoreOpen,
    storeStatusMessage: valueOrFallback(row.storeStatusMessage, closedMessage),
    storeStatusChangedAt: row.storeStatusChangedAt,
    operatingHoursConfigured: row.operatingHours.length > 0,
    operatingHours: mergedOperatingHours,
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
