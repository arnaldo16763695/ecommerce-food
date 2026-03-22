import { beforeEach, describe, expect, it, vi } from "vitest";

const hashMock = vi.fn();
const userFindUniqueMock = vi.fn();
const userCreateMock = vi.fn();
const verificationDeleteManyMock = vi.fn();
const verificationCreateMock = vi.fn();
const createAuditLogMock = vi.fn();
const sendVerificationEmailMock = vi.fn();
const buildVerificationUrlMock = vi.fn();

vi.mock("bcryptjs", () => ({
  default: {
    hash: hashMock,
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: userFindUniqueMock,
      create: userCreateMock,
    },
    verificationToken: {
      deleteMany: verificationDeleteManyMock,
      create: verificationCreateMock,
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: createAuditLogMock,
}));

vi.mock("@/lib/notifications/verification-email", () => ({
  buildVerificationUrl: buildVerificationUrlMock,
  sendVerificationEmail: sendVerificationEmailMock,
}));

describe("auth register audit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes an audit log when a new account is created", async () => {
    userFindUniqueMock.mockResolvedValueOnce(null);
    hashMock.mockResolvedValueOnce("hashed-password");
    userCreateMock.mockResolvedValueOnce({
      id: "user_1",
      email: "ana@example.com",
    });
    verificationDeleteManyMock.mockResolvedValueOnce({ count: 0 });
    verificationCreateMock.mockResolvedValueOnce({});
    buildVerificationUrlMock.mockReturnValueOnce("http://localhost/verify");
    sendVerificationEmailMock.mockResolvedValueOnce(undefined);

    const mod = await import("../app/api/auth/register/route");
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "ana@example.com",
        password: "password123",
      }),
    });

    const res = await mod.POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.user).toEqual({
      id: "user_1",
      email: "ana@example.com",
    });
    expect(createAuditLogMock).toHaveBeenCalledWith({
      actor: { id: "user_1", role: "CUSTOMER" },
      action: "ACCOUNT_REGISTERED",
      entityType: "USER",
      entityId: "user_1",
      entityLabel: "ana@example.com",
      summary: "Se registro una nueva cuenta para ana@example.com.",
      request: expect.any(Request),
      metadata: {
        email: "ana@example.com",
      },
    });
  });
});
