"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import MainNav from "@/components/header/MainNav";
import Logo from "@/components/header/Logo";
import TenantSwitcher from "@/components/header/TenantSwitcher";
import UserSection from "@/components/header/UserSection";
import { isActivePath, isHrActivePath } from "@/components/header/navigation";
import {
  clearTenantContext,
  clearToken,
  getTenantContext,
  isTenantContextAll,
  setTenantContext,
  setTenantContextAll,
} from "@/lib/auth";
import { logout as apiLogout, setDefaultTenant } from "@/lib/api";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { canFilterByTenantContext } from "@/lib/tenantAccess";
import { useToast } from "@/lib/hooks/useToast";
import { useUnreadNotificationsCount } from "@/hooks/notifications/useUnreadNotificationsCount";

function HeaderComponent() {
  const ALL_TENANTS = "all" as const;
  const pathname = usePathname();
  const router = useRouter();
  const {user, refreshAction} = useCurrentUser();
  const {errorAction, successAction} = useToast();

  const [isHrMenuOpen, setIsHrMenuOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | "all">(ALL_TENANTS);
  const [tenantLoading, setTenantLoading] = useState(false);

  const hrMenuRef = useRef<HTMLDivElement | null>(null);

  const canSwitchTenant = canFilterByTenantContext(user);
  const hasSuperadminRole = (user?.roles || []).some((role) => role.name === "Superadmin");
  const isHrActive = isHrActivePath(pathname);
  const { unreadCount } = useUnreadNotificationsCount({
    userId: user?.id ?? null,
    enabled: Boolean(user),
    includeAllTenants: canSwitchTenant,
  });

  const isActiveAction = (path: string) => isActivePath(pathname, path);

  const handleLogoutAction = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      // Clear token first to ensure no API calls are made with invalid credentials
      clearToken();
      // Then clear tenant context
      clearTenantContext();
      router.replace("/login");
    }
  };

  useEffect(() => {
    if (!user || !canSwitchTenant) {
      setTenantOptions([]);
      setSelectedTenantId(ALL_TENANTS);
      return;
    }

    const explicitlyAllTenants = isTenantContextAll();
    const cachedTenantId = getTenantContext();
    const preferredTenantId = explicitlyAllTenants ? null : cachedTenantId;

    setSelectedTenantId(preferredTenantId ?? ALL_TENANTS);

    let mounted = true;
    setTenantLoading(true);

    listTenants({include_archived: hasSuperadminRole})
      .then((res) => {
        if (!mounted) return;
        setTenantOptions(res.data ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setTenantOptions([]);
      })
      .finally(() => {
        if (mounted) setTenantLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [canSwitchTenant, hasSuperadminRole, user]);

  async function handleTenantChangeAction(value: string | number) {
    if (value === ALL_TENANTS) {
      const previousTenantId = selectedTenantId;
      setSelectedTenantId(ALL_TENANTS);

      try {
        setTenantContextAll();
        await refreshAction();
        router.refresh();
        successAction("Tenant scope set to all tenants.");
      } catch {
        setSelectedTenantId(previousTenantId);
        errorAction("Failed to switch tenant.");
      }
      return;
    }

    const nextTenantId = Number(value);
    if (!Number.isInteger(nextTenantId) || nextTenantId <= 0) return;

    const previousTenantId = selectedTenantId;
    setSelectedTenantId(nextTenantId);
    setTenantContext(nextTenantId);

    try {
      await setDefaultTenant(nextTenantId);
      await refreshAction();
      router.refresh();
      successAction("Default tenant updated.");
    } catch (err) {
      console.error("Failed to persist selected tenant:", err);
      if (previousTenantId !== ALL_TENANTS) {
        setTenantContext(previousTenantId);
      } else {
        setTenantContextAll();
      }
      setSelectedTenantId(previousTenantId);
      errorAction("Failed to switch tenant.");
    }
  }

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent): void {
      if (!hrMenuRef.current) return;
      if (event.target instanceof Node && !hrMenuRef.current.contains(event.target)) {
        setIsHrMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setIsHrMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setIsHrMenuOpen(false);
  }, [pathname]);

  return (
    <header className="bg-gray-900/90 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-8xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center justify-start gap-4">
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className="inline-flex items-center text-slate-300 hover:text-white transition-colors"
          >
            <Logo
              aria-hidden="true"
              focusable="false"
              className="block h-12 pr-2 w-auto shrink-0"
            />
          </Link>

          <MainNav
            hasSuperadminRole={hasSuperadminRole}
            hrMenuRef={hrMenuRef}
            isActiveAction={isActiveAction}
            isHrActive={isHrActive}
            isHrMenuOpen={isHrMenuOpen}
            onToggleHrMenuAction={() => setIsHrMenuOpen((prev) => !prev)}
            showNav={Boolean(user)}
          />
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <UserSection
              email={user.email}
              name={user.name}
              onLogoutAction={() => void handleLogoutAction()}
              unreadNotificationsCount={unreadCount}
            />
          </div>
        )}
      </div>
      <div className="max-w-8xl mx-auto px-6 pb-4 flex justify-end items-center">
        {user && (
          <TenantSwitcher
            allTenantsValue={ALL_TENANTS}
            canSwitchTenant={canSwitchTenant}
            onTenantChangeAction={handleTenantChangeAction}
            selectedTenantId={selectedTenantId}
            tenantLoading={tenantLoading}
            tenantOptions={tenantOptions}
          />)}
      </div>
    </header>
  );
}

export default memo(HeaderComponent);
