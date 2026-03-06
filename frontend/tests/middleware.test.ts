import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "@/proxy";

type MockRequestOptions = {
  defaultSessionCookie?: string;
  namedSessionCookie?: string;
};

function makeRequest(path: string, options: MockRequestOptions = {}): NextRequest {
  const nextUrl = new URL(`http://localhost${path}`);
  const cookies = [
    ...(options.defaultSessionCookie
      ? [{ name: "laravel_session", value: options.defaultSessionCookie }]
      : []),
    ...(options.namedSessionCookie
      ? [{ name: "occ-session", value: options.namedSessionCookie }]
      : []),
  ];

  return {
    nextUrl,
    url: nextUrl.toString(),
    cookies: {
      get: (name: string) => cookies.find((cookie) => cookie.name === name),
      getAll: () => cookies,
    },
  } as unknown as NextRequest;
}

describe("Middleware - Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated protected routes to login with return path", () => {
    const response = middleware(makeRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login?from=%2Fdashboard");
  });

  it("treats notifications and maintenance routes as protected", () => {
    const notifications = middleware(makeRequest("/notifications"));
    const maintenance = middleware(makeRequest("/maintenance"));

    expect(notifications.headers.get("location")).toContain("/login?from=%2Fnotifications");
    expect(maintenance.headers.get("location")).toContain("/login?from=%2Fmaintenance");
  });

  it("allows authenticated protected requests and sets security headers", () => {
    const response = middleware(makeRequest("/dashboard", { defaultSessionCookie: "abc123" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("X-XSS-Protection")).toBe("1; mode=block");
  });

  it("accepts named session cookie variants", () => {
    const response = middleware(makeRequest("/dashboard", { namedSessionCookie: "named-session" }));

    expect(response.status).toBe(200);
  });

  it("resolves root route according to auth state", () => {
    const unauthenticated = middleware(makeRequest("/"));
    const authenticated = middleware(makeRequest("/", { defaultSessionCookie: "abc123" }));

    expect(unauthenticated.headers.get("location")).toBe("http://localhost/login");
    expect(authenticated.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it("force=1 bypasses stale cookie and redirects back to login", () => {
    const response = middleware(makeRequest("/dashboard?force=1", { defaultSessionCookie: "stale" }));

    expect(response.headers.get("location")).toContain("/login?from=%2Fdashboard");
  });

  it("adds baseline security headers on public routes", () => {
    const response = middleware(makeRequest("/login"));

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("X-XSS-Protection")).toBeNull();
  });
});
