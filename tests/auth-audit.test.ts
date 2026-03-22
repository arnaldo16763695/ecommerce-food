import { beforeEach, describe, expect, it, vi } from "vitest";

let capturedConfig: any;

const userFindUniqueMock = vi.fn();
const compareMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    capturedConfig = config;
    return {
      handlers: {},
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  },
  CredentialsSignin: class CredentialsSignin extends Error {},
}));

vi.mock("next-auth/providers/google", () => ({
  default: (config: Record<string, unknown>) => Object.assign({ id: "google" }, config),
}));

vi.mock("next-auth/providers/facebook", () => ({
  default: (config: Record<string, unknown>) => Object.assign({ id: "facebook" }, config),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: (config: Record<string, unknown>) =>
    Object.assign({ id: "credentials" }, config),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    user: {
      findUnique: userFindUniqueMock,
    },
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: compareMock,
  },
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: createAuditLogMock,
}));

describe("auth credentials audit", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    capturedConfig = null;
    await import("../auth");
  });

  it("logs failed credential login attempts", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "user_1",
      role: "CUSTOMER",
      email: "ana@example.com",
      name: "Ana",
      image: null,
      passwordHash: "hashed",
      emailVerified: new Date("2026-03-16T10:00:00.000Z"),
    });
    compareMock.mockResolvedValueOnce(false);

    const provider = capturedConfig.providers.find(
      (item: { id: string }) => item.id === "credentials",
    );

    const result = await provider.authorize(
      {
        email: "ana@example.com",
        password: "bad-password",
        portal: "admin",
      },
      new Request("http://localhost/login", {
        method: "POST",
        headers: {
          "user-agent": "vitest",
          "x-forwarded-for": "127.0.0.1",
        },
      }),
    );

    expect(result).toBeNull();
    expect(createAuditLogMock).toHaveBeenCalledWith({
      actor: { id: "user_1", role: "CUSTOMER" },
      action: "LOGIN_FAILED",
      entityType: "AUTH",
      entityId: "user_1",
      entityLabel: "ana@example.com",
      summary: "Fallo el inicio de sesion para ana@example.com.",
      request: expect.any(Request),
      metadata: {
        reason: "INVALID_PASSWORD",
        portal: "admin",
      },
    });
  });

  it("logs successful credential logins", async () => {
    userFindUniqueMock.mockResolvedValueOnce({
      id: "user_1",
      role: "ADMIN",
      email: "ana@example.com",
      name: "Ana",
      image: null,
      passwordHash: "hashed",
      emailVerified: new Date("2026-03-16T10:00:00.000Z"),
    });
    compareMock.mockResolvedValueOnce(true);

    const provider = capturedConfig.providers.find(
      (item: { id: string }) => item.id === "credentials",
    );

    const result = await provider.authorize(
      {
        email: "ana@example.com",
        password: "good-password",
        portal: "admin",
        rememberMe: "true",
      },
      new Request("http://localhost/login", {
        method: "POST",
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: "user_1",
        role: "ADMIN",
        email: "ana@example.com",
      }),
    );
    expect(createAuditLogMock).toHaveBeenCalledWith({
      actor: { id: "user_1", role: "ADMIN" },
      action: "LOGIN_SUCCESS",
      entityType: "AUTH",
      entityId: "user_1",
      entityLabel: "ana@example.com",
      summary: "Inicio de sesion exitoso para ana@example.com.",
      request: expect.any(Request),
      metadata: {
        portal: "admin",
        rememberMe: true,
      },
    });
  });
});
