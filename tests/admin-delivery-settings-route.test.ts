import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findUniqueMock = vi.fn();
const upsertMock = vi.fn();
const findUniqueOrThrowMock = vi.fn();
const deleteManyMock = vi.fn();
const createManyMock = vi.fn();
const transactionMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: createAuditLogMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    storeSettings: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
      findUniqueOrThrow: findUniqueOrThrowMock,
    },
    storeOperatingHour: {
      deleteMany: deleteManyMock,
      createMany: createManyMock,
    },
    $transaction: transactionMock,
  },
}));

const operatingHoursPayload = [
  { dayOfWeek: 1, opensAt: "08:00", closesAt: "20:00", isEnabled: true },
  { dayOfWeek: 2, opensAt: "08:00", closesAt: "20:00", isEnabled: true },
  { dayOfWeek: 3, opensAt: "08:00", closesAt: "20:00", isEnabled: true },
  { dayOfWeek: 4, opensAt: "08:00", closesAt: "20:00", isEnabled: true },
  { dayOfWeek: 5, opensAt: "08:00", closesAt: "20:00", isEnabled: true },
  { dayOfWeek: 6, opensAt: "08:00", closesAt: "20:00", isEnabled: true },
  { dayOfWeek: 0, opensAt: "08:00", closesAt: "20:00", isEnabled: false },
];

describe("admin delivery-settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    transactionMock.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          storeSettings: {
            upsert: upsertMock,
            findUniqueOrThrow: findUniqueOrThrowMock,
          },
          storeOperatingHour: {
            deleteMany: deleteManyMock,
            createMany: createManyMock,
          },
        }),
    );
  });

  it("returns 403 on GET when user is not admin", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "CUSTOMER" } });

    const mod = await import("../app/api/admin/delivery-settings/route");
    const res = await mod.GET();

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns store settings on GET", async () => {
    authMock.mockResolvedValueOnce({ user: { role: "ADMIN" } });
    findUniqueMock.mockResolvedValueOnce({
      deliveryFeeCents: 1200,
      freeDeliveryMinCents: 15000,
      isStoreOpen: false,
      storeStatusMessage: "La tienda abrira mas tarde hoy.",
      storeStatusChangedAt: new Date("2026-03-18T12:00:00.000Z"),
      operatingHours: operatingHoursPayload,
      paymentMobileBank: "Banesco",
      paymentMobilePhone: "04141234567",
      paymentMobileId: "J-12345678-9",
      paymentTransferBank: "Mercantil",
      paymentTransferAccountType: "Corriente",
      paymentTransferAccountNumber: "01050000000000000000",
      paymentTransferId: "J-12345678-9",
      paymentBeneficiaryName: "Food Salad C.A.",
    });

    const mod = await import("../app/api/admin/delivery-settings/route");
    const res = await mod.GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.isStoreOpen).toBe(false);
    expect(body.data.storeStatusMessage).toBe("La tienda abrira mas tarde hoy.");
    expect(body.data.operatingHoursConfigured).toBe(true);
    expect(body.data.operatingHours).toHaveLength(7);
    expect(body.data.paymentTransferAccountNumber).toBe("01050000000000000000");
    expect(body.data.paymentBeneficiaryName).toBe("Food Salad C.A.");
  });

  it("updates store settings, operating hours, and writes audit log", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "admin_1", role: "ADMIN" } });
    findUniqueMock.mockResolvedValueOnce({
      deliveryFeeCents: 1000,
      freeDeliveryMinCents: 10000,
      isStoreOpen: false,
      storeStatusMessage: "La tienda aun no esta operativa.",
      storeStatusChangedAt: new Date("2026-03-18T10:00:00.000Z"),
      operatingHours: operatingHoursPayload,
      paymentMobileBank: "Provincial",
      paymentMobilePhone: "04140000000",
      paymentMobileId: "V-12345678",
      paymentTransferBank: "Provincial",
      paymentTransferAccountType: "Ahorro",
      paymentTransferAccountNumber: "01080000000000000000",
      paymentTransferId: "V-12345678",
      paymentBeneficiaryName: "Antes C.A.",
    });
    upsertMock.mockResolvedValueOnce({ id: "settings_1" });
    findUniqueOrThrowMock.mockResolvedValueOnce({
      deliveryFeeCents: 1300,
      freeDeliveryMinCents: 18000,
      isStoreOpen: true,
      storeStatusMessage: "La tienda esta cerrada temporalmente.",
      storeStatusChangedAt: new Date("2026-03-18T12:30:00.000Z"),
      operatingHours: operatingHoursPayload,
      paymentMobileBank: "Banesco",
      paymentMobilePhone: "04141234567",
      paymentMobileId: "J-12345678-9",
      paymentTransferBank: "Mercantil",
      paymentTransferAccountType: "Corriente",
      paymentTransferAccountNumber: "01050000000000000000",
      paymentTransferId: "J-12345678-9",
      paymentBeneficiaryName: "Food Salad C.A.",
    });

    const mod = await import("../app/api/admin/delivery-settings/route");
    const req = new Request("http://localhost/api/admin/delivery-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryFeeCents: 1300,
        freeDeliveryMinCents: 18000,
        isStoreOpen: true,
        storeStatusMessage: "La tienda esta cerrada temporalmente.",
        paymentMobileBank: "Banesco",
        paymentMobilePhone: "04141234567",
        paymentMobileId: "J-12345678-9",
        paymentTransferBank: "Mercantil",
        paymentTransferAccountType: "Corriente",
        paymentTransferAccountNumber: "01050000000000000000",
        paymentTransferId: "J-12345678-9",
        paymentBeneficiaryName: "Food Salad C.A.",
        operatingHours: operatingHoursPayload,
      }),
    });

    const res = await mod.PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { singletonKey: "default" },
      update: expect.objectContaining({
        isStoreOpen: true,
        storeStatusMessage: "La tienda esta cerrada temporalmente.",
        paymentMobileBank: "Banesco",
        paymentTransferAccountNumber: "01050000000000000000",
        paymentBeneficiaryName: "Food Salad C.A.",
      }),
      create: expect.objectContaining({
        singletonKey: "default",
        isStoreOpen: true,
        paymentMobileBank: "Banesco",
        paymentTransferAccountNumber: "01050000000000000000",
      }),
      select: { id: true },
    });
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { storeSettingsId: "settings_1" },
    });
    expect(createManyMock).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          storeSettingsId: "settings_1",
          dayOfWeek: 1,
          opensAt: "08:00",
          closesAt: "20:00",
          isEnabled: true,
        }),
      ]),
    });
    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "STORE_OPENED",
        entityType: "STORE_SETTINGS",
        entityId: "default",
        entityLabel: "Configuracion de tienda",
        summary: "Abre la tienda para aceptar pedidos.",
      }),
    );
    expect(body.data.paymentMobilePhone).toBe("04141234567");
    expect(body.data.operatingHoursConfigured).toBe(true);
  });
});
