"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

/**
 * ProtectedRoute – component-level auth guard.
 *
 * Blocks rendering of children until the auth state is resolved:
 *  - While loading: shows a loading indicator (no flash of protected content).
 *  - If no user after loading: returns null and triggers a redirect to /login.
 *  - If user is present: renders children normally.
 *
 * Global auth guarding for the full app is handled at the AppChrome level.
 * This component is an explicit secondary guard for pages that need it.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [router, user, loading]);

  if (loading) {
    return (
      <div className="container pt-12 text-center">
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    // Redirect is in flight – render nothing to prevent flash of protected content.
    return null;
  }

  return <>{children}</>;
}
