import { RiFacebookFill, RiGoogleFill } from "@remixicon/react";
import React from "react";

function LoginPage() {
  return (
    <>
      <section className="min-h-svh flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden p-8 sm:p-10">
          {/* Logo   */}
          <span className="text-2xl font-semibold text-amber-600 font-cunia text-center block">
            LOGO
          </span>
          <div className="space-y-8">
            <div className="text-center space-y-2 mt-5">
              <h2 className="text-3xl lg:text-4xl text-neutral-800">
                Welcome back
              </h2>
              <p className="text-gray-600">
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
              </p>
            </div>
            {/* Form   */}
            <form action="" className="space-y-6">
              {/* Wrapper  */}
              <div className="space-y-5">
                {/* Email field  */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-amber-600 transition-color focus:ring-2 outline-none transition-colors"
                  />
                </div>
                {/* Password field  */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-amber-600 transition-color focus:ring-2 outline-none transition-colors"
                  />
                </div>
              </div>
              {/* Wrapper  */}
              <div className="flex items-center justify-between flex-wrap gap-5">
                <div className="flex items-center gap-2">
                  <input
                    className="size-4 text-amber-600 focus:ring-amber-600 border-gray-300 rounded-2xl"
                    type="checkbox"
                    name="remember"
                    id="remember"
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm block text-gray-700"
                  >
                    Remember me
                  </label>
                </div>
                <a
                  href="#"
                  className="text-amber-600 hover:underline hover:text-amber-700 transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              {/* Btn  */}
              <button className="btn-primary w-full py-3 text-lg">
                Sign in
              </button>
            </form>
            {/* Divider  */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-amber-50 text-gray-500">Or continue with</span>
              </div>
            </div>
            {/* Social login buttons   */}
            <div className="grid gap-4 grid-cols-2 font-cunia">
              <button className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 border border-gray-300 rounded-lg  text-gray-700 bg-white hover:bg-gray-50 transition-all">
                <span className="">
                  <RiGoogleFill />
                </span>
                  Google
              </button>
              <button className="w-full inline-flex justify-center items-center gap-2 py-3 border border-gray-300 rounded-lg  text-gray-700 bg-white hover:bg-gray-50 transition-all">
                <span>
                  <RiFacebookFill />
                </span>
                Facebook
              </button>
            </div>

            <div className="text-center text-sm gap-2 flex justify-center flex-wrap">
              <span className="text-gray-600 block">Dont have an account?</span>
              <a
                href="#"
                className="hover:text-amber-600 focus:text-amber-700 hover:underline transition-colors"
              >
                Sign up
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default LoginPage;
