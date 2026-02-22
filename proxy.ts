import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/signup"];
const PROTECTED_ROUTES = ["/shopping-cart", "/checkout", "/orders", "/profile"];

function hasSessionCookie(req: NextRequest) {
  return Boolean(
    req.cookies.get("authjs.session-token")?.value ||
      req.cookies.get("__Secure-authjs.session-token")?.value ||
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value,
  );
}

export default function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const isLoggedIn = hasSessionCookie(req);

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/shopping-cart/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/profile/:path*",
  ],
};

