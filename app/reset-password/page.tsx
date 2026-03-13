"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";
  const hasValidParams = useMemo(() => Boolean(email && token), [email, token]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload?.error ?? "No se pudo restablecer la contrasena.");
        return;
      }

      router.push("/login?reset=1");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="min-h-svh flex items-center justify-center bg-linear-to-b from-primary-50/60 to-transparent px-4 py-12 dark:from-slate-800/40 dark:to-slate-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50 sm:p-10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30">
        <span className="font-cunia block text-center text-2xl font-semibold text-primary-600">
          LOGO
        </span>

        <div className="mt-5 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl text-neutral-800 dark:text-slate-100 lg:text-4xl">
              Nueva contrasena
            </h2>
            <p className="text-gray-600 dark:text-slate-300">
              Define tu nueva contrasena para acceder nuevamente.
            </p>
          </div>

          {!hasValidParams ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
                El enlace de recuperacion es invalido.
              </div>
              <Link
                href="/forgot-password"
                className="block text-center font-medium transition-colors hover:text-primary-600 hover:underline focus:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Solicitar un nuevo enlace
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200"
                >
                  Contrasena nueva
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu nueva contrasena"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-primary-400 dark:focus:ring-primary-400/30"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200"
                >
                  Confirmar contrasena
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contrasena"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-primary-400 dark:focus:ring-primary-400/30"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Guardando..." : "Restablecer contrasena"}
              </button>
            </form>
          )}

          <div className="text-center text-sm">
            <Link
              href="/login"
              className="font-medium transition-colors hover:text-primary-600 hover:underline focus:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            >
              Volver a iniciar sesion
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
