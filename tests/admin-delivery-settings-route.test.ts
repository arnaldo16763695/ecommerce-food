import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const findUniqueMock = vi.fn();
const upsertMock = vi.fn();
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
    },
  },
}));

describe("admin delivery-settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(body.data.paymentTransferAccountNumber).toBe("01050000000000000000");
    expect(body.data.paymentBeneficiaryName).toBe("Food Salad C.A.");
  });

  it("updates store payment settings and writes audit log", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "admin_1", role: "ADMIN" } });
    findUniqueMock.mockResolvedValueOnce({
      deliveryFeeCents: 1000,
      freeDeliveryMinCents: 10000,
      paymentMobileBank: "Provincial",
      paymentMobilePhone: "04140000000",
      paymentMobileId: "V-12345678",
      paymentTransferBank: "Provincial",
      paymentTransferAccountType: "Ahorro",
      paymentTransferAccountNumber: "01080000000000000000",
      paymentTransferId: "V-12345678",
      paymentBeneficiaryName: "Antes C.A.",
    });
    upsertMock.mockResolvedValueOnce({
      deliveryFeeCents: 1300,
      freeDeliveryMinCents: 18000,
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
        paymentMobileBank: "Banesco",
        paymentMobilePhone: "04141234567",
        paymentMobileId: "J-12345678-9",
        paymentTransferBank: "Mercantil",
        paymentTransferAccountType: "Corriente",
        paymentTransferAccountNumber: "01050000000000000000",
        paymentTransferId: "J-12345678-9",
        paymentBeneficiaryName: "Food Salad C.A.",
      }),
    });

    const res = await mod.PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { singletonKey: "default" },
      update: expect.objectContaining({
        paymentMobileBank: "Banesco",
        paymentTransferAccountNumber: "01050000000000000000",
        paymentBeneficiaryName: "Food Salad C.A.",
      }),
      create: expect.objectContaining({
        singletonKey: "default",
        paymentMobileBank: "Banesco",
        paymentTransferAccountNumber: "01050000000000000000",
      }),
      select: expect.any(Object),
    });
    expect(createAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE",
        entityType: "STORE_SETTINGS",
        entityId: "default",
        entityLabel: "Configuracion de tienda",
        summary: "Actualizo la configuracion de tienda y datos de pago del negocio.",
      }),
    );
    expect(body.data.paymentMobilePhone).toBe("04141234567");
  });
});
