import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const userFindUniqueMock = vi.fn();
const userUpdateMock = vi.fn();
const auditLogCreateMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: userFindUniqueMock,
      update: userUpdateMock,
    },
    auditLog: {
      create: auditLogCreateMock,
    },
  },
}));

describe("admin users audit integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes an audit log when an admin updates a user role", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    userFindUniqueMock.mockResolvedValueOnce({
      id: "user_2",
      role: "CUSTOMER",
      name: "Ana",
      email: "ana@example.com",
    });

    userUpdateMock.mockResolvedValueOnce({
      id: "user_2",
      name: "Ana",
      email: "ana@example.com",
      role: "PREPARER",
      emailVerified: null,
      image: null,
    });

    auditLogCreateMock.mockResolvedValueOnce({ id: "log_1" });

    const mod = await import("../app/api/admin/users/[userId]/route");
    const req = new Request("http://localhost/api/admin/users/user_2", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "vitest",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ role: "PREPARER" }),
    });

    const res = await mod.PATCH(req as never, {
      params: Promise.resolve({ userId: "user_2" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.role).toBe("PREPARER");
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin_1",
        actorRole: "ADMIN",
        action: "UPDATE",
        entityType: "USER",
        entityId: "user_2",
        entityLabel: "Ana",
        summary: "Actualizo el rol del usuario a PREPARER.",
        routePath: "/api/admin/users/user_2",
        method: "PATCH",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        metadata: {
          field: "role",
          previousRole: "CUSTOMER",
          nextRole: "PREPARER",
        },
      }),
    });
  });
});
