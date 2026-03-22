import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    storeSettings: {
      findUnique: vi.fn(),
    },
  },
}));

import {
  getDefaultOperatingHours,
  getStoreAvailability,
} from "../lib/data/store-settings";

function buildSettings(overrides?: Partial<Parameters<typeof getStoreAvailability>[0]>) {
  return {
    isStoreOpen: false,
    storeStatusMessage: "La tienda aun no ha sido abierta hoy.",
    storeStatusChangedAt: null,
    operatingHoursConfigured: false,
    operatingHours: getDefaultOperatingHours(),
    ...overrides,
  };
}

describe("getStoreAvailability", () => {
  it("blocks orders when the store is closed and no schedule is configured", () => {
    const availability = getStoreAvailability(
      buildSettings({
        isStoreOpen: false,
        operatingHoursConfigured: false,
      }),
      new Date("2026-03-23T14:00:00.000Z"),
    );

    expect(availability.isAcceptingOrders).toBe(false);
    expect(availability.reason).toBe("La tienda aun no ha sido abierta hoy.");
    expect(availability.scheduleConfigured).toBe(false);
  });

  it("blocks orders before opening time when schedule is configured", () => {
    const availability = getStoreAvailability(
      buildSettings({
        operatingHoursConfigured: true,
        operatingHours: [
          { dayOfWeek: 1, opensAt: "08:00", closesAt: "20:00", isEnabled: true },
        ],
      }),
      new Date("2026-03-23T10:30:00.000Z"),
    );

    expect(availability.isAcceptingOrders).toBe(false);
    expect(availability.reason).toBe("La tienda abre hoy a las 8:00 AM.");
  });

  it("requires the store to have been opened today when schedule is active", () => {
    const availability = getStoreAvailability(
      buildSettings({
        isStoreOpen: true,
        storeStatusChangedAt: new Date("2026-03-22T14:00:00.000Z"),
        operatingHoursConfigured: true,
        operatingHours: [
          { dayOfWeek: 1, opensAt: "08:00", closesAt: "20:00", isEnabled: true },
        ],
      }),
      new Date("2026-03-23T15:00:00.000Z"),
    );

    expect(availability.isAcceptingOrders).toBe(false);
    expect(availability.reason).toBe("La tienda aun no ha sido abierta hoy.");
  });

  it("accepts orders within schedule after the store is opened today", () => {
    const openedToday = new Date("2026-03-23T12:00:00.000Z");

    const availability = getStoreAvailability(
      buildSettings({
        isStoreOpen: true,
        storeStatusChangedAt: openedToday,
        operatingHoursConfigured: true,
        operatingHours: [
          { dayOfWeek: 1, opensAt: "08:00", closesAt: "20:00", isEnabled: true },
        ],
      }),
      new Date("2026-03-23T15:00:00.000Z"),
    );

    expect(availability.isAcceptingOrders).toBe(true);
    expect(availability.reason).toBeNull();
  });
});
