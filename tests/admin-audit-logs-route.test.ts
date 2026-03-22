import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const auditLogCountMock = vi.fn();
const auditLogFindManyMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    auditLog: {
      count: auditLogCountMock,
      findMany: auditLogFindManyMock,
    },
    $transaction: transactionMock,
  },
}));

describe("admin audit logs route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (items: Array<Promise<unknown>>) =>
      Promise.all(items),
    );
  });

  it("returns 401 when user is not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);

    const mod = await import("../app/api/admin/audit-logs/route");
    const req = new Request("http://localhost/api/admin/audit-logs");
    const res = await mod.GET(req as never);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns paginated audit logs for admins with filters", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    auditLogCountMock.mockResolvedValueOnce(1);
    auditLogFindManyMock.mockResolvedValueOnce([
      {
        id: "log_1",
        action: "UPDATE",
        entityType: "USER",
        entityId: "user_2",
        entityLabel: "Ana",
        summary: "Actualizo el rol del usuario.",
        routePath: "/api/admin/users/user_2",
        method: "PATCH",
        ipAddress: "127.0.0.1",
        metadata: { previousRole: "CUSTOMER", nextRole: "PREPARER" },
        actorRole: "ADMIN",
        createdAt: new Date("2026-03-16T10:00:00.000Z"),
        actorUser: {
          id: "admin_1",
          name: "Administrador",
          email: "admin@example.com",
        },
      },
    ]);

    const mod = await import("../app/api/admin/audit-logs/route");
    const req = new Request(
      "http://localhost/api/admin/audit-logs?page=2&limit=20&q=Ana&action=UPDATE&entityType=USER",
    );
    const res = await mod.GET(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(auditLogCountMock).toHaveBeenCalledWith({
      where: {
        AND: [
          { action: "UPDATE" },
          { entityType: "USER" },
          {
            OR: [
              { summary: { contains: "Ana", mode: "insensitive" } },
              { entityLabel: { contains: "Ana", mode: "insensitive" } },
              { entityId: { contains: "Ana", mode: "insensitive" } },
              { routePath: { contains: "Ana", mode: "insensitive" } },
              {
                actorUser: { is: { name: { contains: "Ana", mode: "insensitive" } } },
              },
              {
                actorUser: { is: { email: { contains: "Ana", mode: "insensitive" } } },
              },
            ],
          },
        ],
      },
    });
    expect(body.meta).toEqual({
      page: 2,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        id: "log_1",
        action: "UPDATE",
        entityType: "USER",
      }),
    );
  });
});
