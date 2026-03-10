"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginFormSchema } from "@/lib/zod";

interface SignInResponse {
  error?: string | null;
  url?: string | null;
  code?: string | null;
}

type LoginFormInput = z.input<typeof LoginFormSchema>;
type LoginFormValues = z.output<typeof LoginFormSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin/dashboard";
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setAuthError(null);

    const res = await signIn("credentials", {
      email: data.email,
      password: data.password,
      portal: "admin",
      rememberMe: data.rememberMe ? "true" : "false",
      redirect: false,
      callbackUrl,
    });

    let error: string | null = null;
    let code: string | null = null;
    let url: string | null = null;

    if (typeof res === "string") {
      const parsed = new URL(res, window.location.origin);
      error = parsed.searchParams.get("error");
      code = parsed.searchParams.get("code");
      url = res;
    } else {
      error = (res as SignInResponse | undefined)?.error ?? null;
      code = (res as SignInResponse | undefined)?.code ?? null;
      url = (res as SignInResponse | undefined)?.url ?? null;

      if (!code && url) {
        const parsed = new URL(url, window.location.origin);
        code = parsed.searchParams.get("code");
      }
    }

    if (error === "CredentialsSignin" && code === "EmailNotVerified") {
      setAuthError("Debes verificar tu correo antes de iniciar sesion.");
      return;
    }

    if (error === "CredentialsSignin" && code === "NotAdmin") {
      setAuthError("Tu cuenta no tiene acceso al panel de administracion.");
      return;
    }

    if (error === "CredentialsSignin") {
      setAuthError("Email o contrasena invalidos.");
      return;
    }

    router.push(url ?? callbackUrl);
  }

  return (
    <section className="flex min-h-svh items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-900">
          Acceso de administrador
        </h1>
        <p className="mb-8 text-center text-sm text-slate-600">
          Ingresa con una cuenta de administrador.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-slate-700">
              Correo
            </label>
            <input
              id="email"
              type="email"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {authError && <p className="text-sm text-red-600">{authError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-amber-600 px-4 py-3 font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Ingresando..." : "Entrar al panel"}
          </button>
        </form>
      </div>
    </section>
  );
}
