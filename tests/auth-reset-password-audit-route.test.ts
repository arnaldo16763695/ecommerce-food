import { beforeEach, describe, expect, it, vi } from "vitest";

const hashMock = vi.fn();
const verificationFindFirstMock = vi.fn();
const userFindUniqueMock = vi.fn();
const transactionMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock("bcryptjs", () => ({
  default: {
    hash: hashMock,
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    verificationToken: {
      findFirst: verificationFindFirstMock,
      deleteMany: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findUnique: userFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: createAuditLogMock,
}));

describe("auth reset password audit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockResolvedValue([]);
  });

  it("writes an audit log when a password reset is completed", async () => {
    verificationFindFirstMock.mockResolvedValueOnce({
      identifier: "pwd:ana@example.com",
      token: "hashed-token",
      expires: new Date(Date.now() + 60_000),
    });
    hashMock.mockResolvedValueOnce("new-password-hash");
    userFindUniqueMock.mockResolvedValueOnce({
      id: "user_1",
      email: "ana@example.com",
      role: "CUSTOMER",
    });

    const mod = await import("../app/api/auth/reset-password/route");
    const req = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "ana@example.com",
        token: "raw-token",
        password: "new-password123",
      }),
    });

    const res = await mod.POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(createAuditLogMock).toHaveBeenCalledWith({
      actor: { id: "user_1", role: "CUSTOMER" },
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "USER",
      entityId: "user_1",
      entityLabel: "ana@example.com",
      summary: "Se actualizo la contrasena de ana@example.com.",
      request: expect.any(Request),
      metadata: {
        email: "ana@example.com",
      },
    });
  });
});
