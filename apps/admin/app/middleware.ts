import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/signup"];
const authPaths = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the session cookie
  const sessionCookie = request.cookies.get("better-auth.session_token");
  const isAuthenticated = !!sessionCookie;

  // If user is authenticated and tries to access auth pages, redirect to feed
  if (isAuthenticated && authPaths.includes(pathname)) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  // If user is not authenticated and tries to access protected pages, redirect to login
  if (!isAuthenticated && !publicPaths.includes(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
