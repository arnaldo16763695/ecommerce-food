"use client";
import { RiGoogleFill } from "@remixicon/react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LoginFormSchema } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// Type definition for NextAuth signIn response with additional properties
interface SignInResponse {
  error?: string | null;
  url?: string | null;
  code?: string | null;
}

type LoginFormInput = z.input<typeof LoginFormSchema>;
type LoginFormValues = z.output<typeof LoginFormSchema>;

function LoginPage() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const sp = useSearchParams();
  const verify = sp.get("verify");
  const email = sp.get("email");
  const verified = sp.get("verified"); // from /verify-email redirect
  const reset = sp.get("reset");
  const {
    register,
    handleSubmit,
    getValues,
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
    try {
      setAuthError(null);
      setNeedsVerification(false); // ✅ reset every submit
      setResendMsg(null); // ✅ reset every submit

      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe ? "true" : "false",
        redirect: false, // We'll handle redirects ourselves (custom UI)
        callbackUrl: "/", // Where to go after a successful login
      });

      let error: string | null = null;
      let code: string | null = null;

      if (typeof res === "string") {
        // Sometimes signIn returns a URL string
        const u = new URL(res, window.location.origin);
        error = u.searchParams.get("error");
        code = u.searchParams.get("code");
      } else {
        error = (res as SignInResponse | undefined)?.error ?? null;

        // Some builds expose `code`, others put it inside the returned URL
        const maybeCode = (res as SignInResponse | undefined)?.code ?? null;
        if (maybeCode) code = maybeCode;
        else if ((res as SignInResponse | undefined)?.url) {
          const u = new URL(
            (res as SignInResponse).url!,
            window.location.origin,
          );
          code = u.searchParams.get("code");
        }
      }

      // Email not verified
      if (error === "CredentialsSignin" && code === "EmailNotVerified") {
        setAuthError("Debes verificar tu correo antes de iniciar sesión.");
        setNeedsVerification(true);
        return;
      }

      // Wrong email/password
      if (error === "CredentialsSignin") {
        setAuthError("Correo o contraseña incorrectos.");
        return;
      }

      // Login OK
      router.push(
        (typeof res === "string"
          ? res
          : (res as SignInResponse | undefined)?.url) ?? "/",
      );
    } catch (err) {
      console.error("Sign-in error:", err);
      setAuthError("Algo salió mal. Inténtalo de nuevo.");
    }
  }

  return (
    <>
      <section className="min-h-svh flex items-center justify-center bg-linear-to-b from-amber-50/60 to-transparent px-4 py-12 dark:from-slate-800/40 dark:to-slate-900 sm:px-6 lg:px-8">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50 sm:p-10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30">
          {/* Logo   */}
          <span className="font-cunia block text-center text-2xl font-semibold text-amber-600">
            LOGO
          </span>
          <div className="space-y-8">
            <div className="text-center space-y-2 mt-5">
              <h2 className="text-3xl text-neutral-800 dark:text-slate-100 lg:text-4xl">
                Bienvenido de nuevo
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                Inicia sesión para seguir pidiendo tus comidas favoritas.
              </p>
            </div>

            {verify === "sent" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                Te enviamos un enlace de verificación{email ? ` a ${email}` : ""}.
                Revisa tu bandeja de entrada.
              </div>
            )}

            {verified === "1" && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-200">
                Correo verificado. Ya puedes iniciar sesión.
              </div>
            )}

            {verified === "0" && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
                El enlace de verificación es inválido o expiró. Puedes solicitar
                uno nuevo abajo.
              </div>
            )}

            {reset === "1" && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-200">
                Contrasena actualizada correctamente. Inicia sesion con tu nueva
                contrasena.
              </div>
            )}
            {/* Form   */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
              noValidate
            >
              {/* Wrapper  */}
              <div className="space-y-5">
                {/* Email field  */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200"
                  >
                    Correo
                  </label>
                  <input
                    type="email"
                    id="email"
                    placeholder="Ingresa tu correo"
                    autoComplete="email"
                    className={`w-full rounded-lg border px-4 py-3 outline-none transition-colors placeholder:text-gray-400 focus:ring-2 ${
                      errors.email
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500"
                        : "border-gray-300 focus:border-amber-500 focus:ring-amber-500/30 dark:border-slate-600 dark:focus:border-amber-400 dark:focus:ring-amber-400/30"
                    } bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400`}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password field  */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200"
                  >
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="password"
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    className={`w-full rounded-lg border px-4 py-3 outline-none transition-colors placeholder:text-gray-400 focus:ring-2 ${
                      errors.password
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500"
                        : "border-gray-300 focus:border-amber-500 focus:ring-amber-500/30 dark:border-slate-600 dark:focus:border-amber-400 dark:focus:ring-amber-400/30"
                    } bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400`}
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Wrapper  */}
              <div className="flex items-center justify-between flex-wrap gap-5">
                <div className="flex items-center gap-2">
                  <input
                    className="size-4 rounded border-gray-300 text-amber-600 focus:ring-amber-600 dark:border-slate-600 dark:bg-slate-900"
                    type="checkbox"
                    id="remember"
                    {...register("rememberMe")}
                  />
                  <label
                    htmlFor="remember"
                    className="block text-sm text-gray-700 dark:text-slate-300"
                  >
                    Recuérdame
                  </label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-amber-600 transition-colors hover:text-amber-700 hover:underline focus:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Btn  */}
              {authError && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {authError}
                  </p>

                  {needsVerification && (
                    <button
                      type="button"
                      className="text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
                      onClick={async () => {
                        setResendMsg(null);

                        const email = getValues("email"); // de react-hook-form
                        await fetch("/api/auth/resend-verification", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email }),
                        });

                        setResendMsg(
                          "Listo. Si ese correo existe y no está verificado, te reenviamos el enlace.",
                        );
                      }}
                    >
                      Reenviar verificación
                    </button>
                  )}

                  {resendMsg && (
                    <p className="text-sm text-gray-600 dark:text-slate-300">
                      {resendMsg}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : (
                  "Iniciar sesión"
                )}
              </button>
            </form>

            {/* Divider  */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-slate-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                  O continúa con
                </span>
              </div>
            </div>

            {/* Social login buttons   */}
            <div className="grid gap-4 grid-cols-1 font-cunia">
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
              >
                <span className="">
                  <RiGoogleFill />
                </span>
                Google
              </button>
            </div>

            <div className="text-center text-sm gap-2 flex justify-center flex-wrap">
              <span className="block text-gray-600 dark:text-slate-300">
                ¿No tienes una cuenta?
              </span>
              <Link
                href="/signup"
                className="font-medium transition-colors hover:text-amber-600 hover:underline focus:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Regístrate
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default LoginPage;

