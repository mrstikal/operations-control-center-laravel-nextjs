import { NextRequest, NextResponse } from "next/server";
import { isProtectedPath } from "@/lib/routing/authRoutes";

/**
 * Middleware for server-side authentication
 * - Validates token presence in cookies/headers
 * - Protects routes from unauthorized access
 * - Handles redirects to login for unauthenticated users
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ?force=1 is set by the API client after a 401 to break stale-session redirect loops.
  const isForced = request.nextUrl.searchParams.get("force") === "1";

  const hasDefaultSessionCookie = !!request.cookies.get("laravel_session")?.value;
  const hasNamedSessionCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.endsWith("-session") && cookie.value.length > 0);
  const isAuthenticated = !isForced && (hasDefaultSessionCookie || hasNamedSessionCookie);

  // Resolve the public entrypoint without a client-side /api/me probe.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(isAuthenticated ? "/dashboard" : "/login", request.url));
  }

  // Redirect authenticated users away from login without a client-side /api/me probe.
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Handle protected routes
  if (isProtectedPath(pathname)) {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Add security headers for authenticated requests
    const response = NextResponse.next();
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");

    return response;
  }

  // Stale-session cookies are handled by /api client redirecting to /login?force=1.

  // Public routes - add security headers
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");

  return response;
}

// Backward-compatible alias for existing tests/imports.
export const proxy = middleware;

// Configure which routes to run middleware on
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

