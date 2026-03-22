import { describe, expect, it } from "vitest";
import { LoginFormSchema } from "../lib/zod";

describe("LoginFormSchema", () => {
  it("accepts valid credentials", () => {
    const result = LoginFormSchema.safeParse({
      email: "test@example.com",
      password: "123456",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = LoginFormSchema.safeParse({
      email: "invalid-email",
      password: "123456",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Correo electronico invalido.");
    }
  });

  it("rejects short password", () => {
    const result = LoginFormSchema.safeParse({
      email: "test@example.com",
      password: "123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "La contrasena debe tener al menos 6 caracteres.",
      );
    }
  });
});
