"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { getMe } from "@/lib/api";
import { authEvents } from "@/lib/auth";
import { resetEcho } from "@/lib/realtime";
import type { Me } from "@/lib/types";

type CurrentUserContextValue = {
  user: Me | null;
  loading: boolean;
  refreshAction: () => Promise<void>;
};

export const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export default function CurrentUserProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const hasResolvedOnceRef = useRef(false);
  const shouldSkipInitialAuthProbe = pathname?.startsWith("/login") ?? false;

  const refreshAction = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    const shouldBlockUi = !hasResolvedOnceRef.current;
    if (shouldBlockUi) {
      setLoading(true);
    }

    try {

      const response = await getMe();
      setUser(response.data);
    } catch {
      setUser(null);
    } finally {
      loadingRef.current = false;
      hasResolvedOnceRef.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (shouldSkipInitialAuthProbe) {
      setLoading(false);
    } else {
      void refreshAction();
    }

    const handleAuthChanged = () => {
      // Reset Echo instance when auth state changes to force re-authentication
      resetEcho();

      if (shouldSkipInitialAuthProbe) {
        setUser(null);
        setLoading(false);
        return;
      }

      void refreshAction();
    };

    window.addEventListener(authEvents.changed, handleAuthChanged);
    window.addEventListener(authEvents.tenantChanged, handleAuthChanged);

    return () => {
      window.removeEventListener(authEvents.changed, handleAuthChanged);
      window.removeEventListener(authEvents.tenantChanged, handleAuthChanged);
    };
  }, [refreshAction, shouldSkipInitialAuthProbe]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshAction,
    }),
    [user, loading, refreshAction]
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}
