"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/Header";
import ArchivedTenantBanner from "@/components/common/ArchivedTenantBanner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { isPublicPath } from "@/lib/routing/authRoutes";

function shouldHideHeader(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/dev");
}

function isTenantBoundPath(pathname: string): boolean {
  return ["/employees", "/shifts", "/time-off"].some((prefix) => pathname.startsWith(prefix));
}

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  const requiresAuth = !isPublicPath(pathname);

  useEffect(() => {
    if (requiresAuth && !loading && !user) {
      router.replace("/login");
    }
  }, [requiresAuth, loading, user, router]);

  // While resolving auth for protected routes: show a neutral loading screen.
  if (requiresAuth && loading) {
    return (
      <div className="container pt-12 text-center">
        <p>Loading…</p>
      </div>
    );
  }

  // Auth resolved but no user – redirect is in flight; render nothing to prevent
  // flashing protected content.
  if (requiresAuth && !user) {
    return null;
  }

  const isTenantArchived = Boolean(user?.tenant_archived || user?.tenant?.deleted_at);
  const tenantName = user?.tenant?.name || `#${user?.tenant_id ?? ""}`;

  return (
    <>
      {!shouldHideHeader(pathname) && <Header />}
      {!shouldHideHeader(pathname) && isTenantBoundPath(pathname) && isTenantArchived && (
        <div className="main-container pt-4">
          <ArchivedTenantBanner tenantName={tenantName} />
        </div>
      )}
      {children}
    </>
  );
}
