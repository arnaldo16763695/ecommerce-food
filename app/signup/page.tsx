"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { RiGoogleFill, RiFacebookFill } from  "@remixicon/react";

const SignUpFormSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof SignUpFormSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(SignUpFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: SignUpFormValues) {
    try {
      setServerError(null);

      // 1) Crear usuario
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Mensajes típicos del endpoint
        if (res.status === 409) {
          setError("email", { message: "This email is already registered." });
          return;
        }
        if (res.status === 400) {
          setServerError(payload?.error ?? "Invalid signup data.");
          return;
        }
        setServerError(payload?.error ?? "Signup failed. Try again.");
        return;
      }

      // // 2) Auto-login
      // const login = await signIn("credentials", {
      //   email: data.email,
      //   password: data.password,
      //   redirect: false,
      //   callbackUrl: "/",
      // });     
      // if (login?.error) {
        //   // Si falla el auto-login, al menos envía al login
        //   router.push("/login");
        //   return;
        // }        
        // router.push(login?.url ?? "/");
        router.push(`/login?verify=sent&email=${encodeURIComponent(data.email)}`);
    } catch (e) {
      setServerError("Server error. Please try again.");
      console.log(e)
    }
  }

  return (
    <section className="min-h-svh flex items-center justify-center bg-linear-to-b from-amber-50/60 to-transparent px-4 py-12 dark:from-slate-800/40 dark:to-slate-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50 sm:p-10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30">
        {/* Logo */}
        <span className="font-cunia block text-center text-2xl font-semibold text-amber-600">
          LOGO
        </span>

        <div className="space-y-8">
          <div className="text-center space-y-2 mt-5">
            <h2 className="text-3xl text-neutral-800 dark:text-slate-100 lg:text-4xl">
              Create account
            </h2>
            <p className="text-gray-600 dark:text-slate-300">
              Sign up to start ordering your favorite meals.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <div className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
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

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  placeholder="Create a password"
                  autoComplete="new-password"
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

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200"
                >
                  Confirm password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className={`w-full rounded-lg border px-4 py-3 outline-none transition-colors placeholder:text-gray-400 focus:ring-2 ${
                    errors.confirmPassword
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500"
                      : "border-gray-300 focus:border-amber-500 focus:ring-amber-500/30 dark:border-slate-600 dark:focus:border-amber-400 dark:focus:ring-amber-400/30"
                  } bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400`}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {serverError && (
              <p className="text-sm text-red-600 dark:text-red-400">{serverError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating account..." : "Sign up"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social buttons */}
          <div className="grid gap-4 grid-cols-2 font-cunia">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
            >
              <RiGoogleFill />
              Google
            </button>

            <button
              type="button"
              onClick={() => signIn("facebook", { callbackUrl: "/" })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
            >
              <RiFacebookFill />
              Facebook
            </button>
          </div>

          <div className="text-center text-sm gap-2 flex justify-center flex-wrap">
            <span className="block text-gray-600 dark:text-slate-300">
              Already have an account?
            </span>
            <Link
              href="/login"
              className="font-medium transition-colors hover:text-amber-600 hover:underline focus:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
