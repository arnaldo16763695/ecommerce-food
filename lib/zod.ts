import * as z from "zod";

export const LoginFormSchema = z.object({
  email: z.string().email("Correo electronico invalido."),
  password: z
    .string()
    .min(6, "La contrasena debe tener al menos 6 caracteres."),
  rememberMe: z.preprocess((value) => value === true || value === "true", z.boolean()),
});
