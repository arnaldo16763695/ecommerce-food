"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
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
              Recuperar contrasena
            </h2>
            <p className="text-gray-600 dark:text-slate-300">
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </p>
          </div>

          {sent && (
            <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900 dark:border-primary-400/30 dark:bg-primary-400/10 dark:text-primary-200">
              Si el correo existe, te enviamos un enlace de recuperacion.
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200"
              >
                Correo
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingresa tu correo"
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-primary-400 dark:focus:ring-primary-400/30"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>

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
