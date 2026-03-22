import { NextResponse } from "next/server";
import { auth } from "@/auth";

const AUTH_ROUTES = ["/login", "/signup"];
const USER_PROTECTED_ROUTES = ["/checkout", "/orders", "/profile"];

export default auth((req) => {
  const { nextUrl, auth: authData } = req;
  const pathname = nextUrl.pathname;

  const isLoggedIn = Boolean(authData?.user);
  const isAdmin = authData?.user?.role === "ADMIN";

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isUserProtectedRoute = USER_PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const isAdminLoginRoute = pathname.startsWith("/admin/login");
  const isAdminRoute = pathname.startsWith("/admin") && !isAdminLoginRoute;

  if (!isLoggedIn && isUserProtectedRoute) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isAdminLoginRoute) {
    if (!isLoggedIn) return NextResponse.next();
    if (isAdmin) return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (isAdminRoute && !isLoggedIn) {
    const adminLoginUrl = new URL("/admin/login", nextUrl);
    adminLoginUrl.searchParams.set("callbackUrl", nextUrl.href);
    return NextResponse.redirect(adminLoginUrl);
  }

  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/admin/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/profile/:path*",
  ],
};
