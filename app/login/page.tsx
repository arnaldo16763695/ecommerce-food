"use client";
import { RiFacebookFill, RiGoogleFill } from "@remixicon/react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LoginFormSchema } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";

function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }, 
  } = useForm<z.infer<typeof LoginFormSchema>>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: z.infer<typeof LoginFormSchema>) {
    try {
      // Simular una petición
      // await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(data);
      // Aquí iría tu lógica de autenticación
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
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
                Welcome back
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                Sign in to continue ordering your favorite meals.
              </p>
            </div>
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

                {/* Password field  */}
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
                    placeholder="Enter your password"
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
                  />
                  <label
                    htmlFor="remember"
                    className="block text-sm text-gray-700 dark:text-slate-300"
                  >
                    Remember me
                  </label>
                </div>
                <Link
                  href="#"
                  className="text-amber-600 transition-colors hover:text-amber-700 hover:underline focus:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Btn  */}
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
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
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
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social login buttons   */}
            <div className="grid gap-4 grid-cols-2 font-cunia">
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700">
                <span className="">
                  <RiGoogleFill />
                </span>
                Google
              </button>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-3 text-gray-700 transition-colors hover:bg-gray-50 focus:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700">
                <span>
                  <RiFacebookFill />
                </span>
                Facebook
              </button>
            </div>

            <div className="text-center text-sm gap-2 flex justify-center flex-wrap">
              <span className="block text-gray-600 dark:text-slate-300">
                Don&apos;t have an account?
              </span>
              <Link
                href="#"
                className="font-medium transition-colors hover:text-amber-600 hover:underline focus:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default LoginPage;