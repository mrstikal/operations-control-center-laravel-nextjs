function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/departments",
  "/employees",
  "/incidents",
  "/shifts",
  "/time-off",
  "/tenants",
  "/contracts",
  "/assets",
  "/maintenance",
  "/notifications",
  "/notification-schedules",
] as const;

export const PUBLIC_ROUTE_PREFIXES = ["/login", "/dev"] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return PUBLIC_ROUTE_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix));
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix));
}

