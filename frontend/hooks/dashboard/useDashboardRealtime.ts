"use client";

import { useEffect } from "react";
import { getEcho } from "@/lib/realtime";

const RELOAD_ALL_DEBOUNCE_MS = 500;
const READ_MODELS_DEBOUNCE_MS = 300;

type UseDashboardRealtimeParams = {
  tenantId: number | null;
  onReloadAllAction: () => Promise<void>;
  onReloadReadModelsAction: () => Promise<void>;
};

export function useDashboardRealtime({
  tenantId,
  onReloadAllAction,
  onReloadReadModelsAction,
}: UseDashboardRealtimeParams) {
  useEffect(() => {
    if (!tenantId) return;

    const echo = getEcho();
    if (!echo) return;

    let reloadAllTimer: ReturnType<typeof setTimeout> | null = null;
    let reloadReadModelsTimer: ReturnType<typeof setTimeout> | null = null;

    const reload = () => {
      if (reloadAllTimer) {
        clearTimeout(reloadAllTimer);
      }

      reloadAllTimer = setTimeout(() => {
        void onReloadAllAction();
      }, RELOAD_ALL_DEBOUNCE_MS);
    };

    const reloadReadModels = () => {
      if (reloadReadModelsTimer) {
        clearTimeout(reloadReadModelsTimer);
      }

      reloadReadModelsTimer = setTimeout(() => {
        void onReloadReadModelsAction();
      }, READ_MODELS_DEBOUNCE_MS);
    };

    const contractsChannel = echo.private(`tenant.${tenantId}.contracts`);
    const incidentsChannel = echo.private(`tenant.${tenantId}.incidents`);
    const dashboardChannel = echo.private(`tenant.${tenantId}.dashboard`);

    contractsChannel.listen(".contract.updated", reload);
    contractsChannel.listen(".contract.created", reload);
    contractsChannel.listen(".contract.deleted", reload);
    contractsChannel.listen(".contract.status_changed", reload);

    incidentsChannel.listen(".incident.updated", reload);
    incidentsChannel.listen(".incident.created", reload);
    incidentsChannel.listen(".incident.deleted", reload);
    incidentsChannel.listen(".incident.escalated", reload);
    incidentsChannel.listen(".incident.closed", reload);

    dashboardChannel.listen(".dashboard.stats_updated", reload);
    dashboardChannel.listen(".dashboard.read_models_updated", reloadReadModels);

    return () => {
      if (reloadAllTimer) {
        clearTimeout(reloadAllTimer);
      }

      if (reloadReadModelsTimer) {
        clearTimeout(reloadReadModelsTimer);
      }

      echo.leave(`tenant.${tenantId}.contracts`);
      echo.leave(`tenant.${tenantId}.incidents`);
      echo.leave(`tenant.${tenantId}.dashboard`);
    };
  }, [tenantId, onReloadAllAction, onReloadReadModelsAction]);
}
