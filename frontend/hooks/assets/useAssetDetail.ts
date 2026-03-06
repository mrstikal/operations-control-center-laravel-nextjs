"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAsset,
  disposeAsset,
  getAssetAuditTrail,
  getAssetById,
  hardDeleteAsset,
  reassignAsset,
  restoreAsset,
  retireAsset,
  transferAsset,
} from "@/lib/api/assets";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { canDelete, canEdit } from "@/lib/permissions";
import type { Asset, AssetAuditTrailItem, Pagination, Permission } from "@/lib/types";

export type DetailTab = "overview" | "maintenance" | "audit";
export type LifecycleAction =
  | "retire"
  | "dispose"
  | "transfer"
  | "reassign"
  | "delete"
  | "restore"
  | "hard-delete"
  | null;

export type AssetLifecyclePayload = {
  reason: string;
  location?: string;
  department?: string;
  disposal_method?: string;
  disposal_date?: string;
  retirement_date?: string;
  assigned_to?: number;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useAssetDetail(assetId: number) {
  const router = useRouter();
  const { user, loading: currentUserLoading } = useCurrentUser();
  const { isReadOnly } = useTenantReadOnly(user);

  const permissions = useMemo<Permission[]>(() => user?.permissions || [], [user?.permissions]);
  const canEditAssets = useMemo(() => canEdit(permissions, "assets"), [permissions]);
  const canDeleteAssets = useMemo(() => canDelete(permissions, "assets"), [permissions]);

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction>(null);
  const [lifecycleModalOpen, setLifecycleModalOpen] = useState(false);

  const [auditItems, setAuditItems] = useState<AssetAuditTrailItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState<Record<string, string>>({});
  const [auditPage, setAuditPage] = useState(1);
  const [auditPerPage, setAuditPerPage] = useState(15);
  const [auditPagination, setAuditPagination] = useState<Pagination>({
    total: 0,
    per_page: 15,
    current_page: 1,
    last_page: 1,
  });

  const refreshAssetAction = useCallback(async () => {
    const response = await getAssetById(assetId);
    setAsset(response.data);
    return response.data;
  }, [assetId]);

  useEffect(() => {
    async function fetchAsset() {
      setLoading(true);
      setLoadError(null);

      try {
        await refreshAssetAction();
      } catch (error) {
        setLoadError(getErrorMessage(error, "Failed to load asset"));
      } finally {
        setLoading(false);
      }
    }

    if (assetId) {
      void fetchAsset();
    }
  }, [assetId, refreshAssetAction]);

  useEffect(() => {
    async function fetchAudit() {
      if (!asset || activeTab !== "audit") {
        return;
      }

      setAuditLoading(true);
      setErrorMessage(null);

      try {
        const response = await getAssetAuditTrail(asset.id, {
          ...auditFilters,
          page: auditPage,
          per_page: auditPerPage,
        });

        setAuditItems(response.data);
        setAuditPagination(
          response.pagination ?? {
            total: response.data.length,
            per_page: auditPerPage,
            current_page: auditPage,
            last_page: 1,
          }
        );
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Failed to load audit trail"));
        setAuditItems([]);
      } finally {
        setAuditLoading(false);
      }
    }

    void fetchAudit();
  }, [asset, activeTab, auditFilters, auditPage, auditPerPage]);

  const clearErrorAction = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const goBackAction = useCallback(() => {
    router.back();
  }, [router]);

  const ensureWritable = useCallback(() => {
    if (!isReadOnly) {
      return true;
    }

    setErrorMessage("Tenant is archived, this page is read-only.");
    return false;
  }, [isReadOnly]);

  const setActiveTabAction = useCallback((nextTab: DetailTab) => {
    setActiveTab(nextTab);
  }, []);

  const handleAuditFilterChangeAction = useCallback((nextFilters: Record<string, string>) => {
    setAuditFilters(nextFilters);
    setAuditPage(1);
  }, []);

  const openLifecycleModalAction = useCallback(
    (action: Exclude<LifecycleAction, null>) => {
      if (!ensureWritable()) {
        return;
      }

      setLifecycleAction(action);
      setLifecycleModalOpen(true);
      setErrorMessage(null);
    },
    [ensureWritable]
  );

  const closeLifecycleModalAction = useCallback(() => {
    if (actionLoading) {
      return;
    }

    setLifecycleModalOpen(false);
    setLifecycleAction(null);
  }, [actionLoading]);

  const handleLifecycleConfirmAction = useCallback(
    async (data: AssetLifecyclePayload) => {
      if (!asset || !lifecycleAction) {
        return;
      }

      if (!ensureWritable()) {
        throw new Error("Tenant is archived, this page is read-only.");
      }

      if (lifecycleAction === "transfer" && !data.location) {
        setErrorMessage("Location is required");
        throw new Error("Location is required");
      }

      setActionLoading(true);
      setErrorMessage(null);

      try {
        let result: Asset | null = null;

        switch (lifecycleAction) {
          case "retire":
            result = (await retireAsset(asset.id, data.reason, data.retirement_date)).data;
            break;
          case "dispose":
            result = (
              await disposeAsset(asset.id, data.reason, data.disposal_method, data.disposal_date)
            ).data;
            break;
          case "transfer":
            result = (
              await transferAsset(asset.id, {
                location: data.location!,
                department: data.department,
                reason: data.reason,
              })
            ).data;
            break;
          case "reassign":
            result = (
              await reassignAsset(asset.id, {
                assigned_to: data.assigned_to,
                reason: data.reason,
              })
            ).data;
            break;
          case "delete":
            await deleteAsset(asset.id, data.reason);
            router.push("/assets");
            setLifecycleModalOpen(false);
            setLifecycleAction(null);
            return;
          case "restore":
            result = (await restoreAsset(asset.id, data.reason)).data;
            break;
          case "hard-delete":
            await hardDeleteAsset(asset.id, data.reason);
            router.push("/assets");
            setLifecycleModalOpen(false);
            setLifecycleAction(null);
            return;
        }

        if (result) {
          setAsset(result);
        }

        setLifecycleModalOpen(false);
        setLifecycleAction(null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Lifecycle action failed"));
        throw error;
      } finally {
        setActionLoading(false);
      }
    },
    [asset, ensureWritable, lifecycleAction, router]
  );

  return {
    asset,
    loading: loading || currentUserLoading,
    loadError,
    errorMessage,
    actionLoading,
    permissions,
    isReadOnly,
    canEditAssets,
    canDeleteAssets,
    activeTab,
    lifecycleAction,
    lifecycleModalOpen,
    auditItems,
    auditLoading,
    auditFilters,
    auditPage,
    auditPerPage,
    auditPagination,
    clearErrorAction,
    goBackAction,
    setActiveTabAction,
    openLifecycleModalAction,
    closeLifecycleModalAction,
    handleLifecycleConfirmAction,
    handleAuditFilterChangeAction,
    setAuditPage,
    setAuditPerPage,
  };
}
