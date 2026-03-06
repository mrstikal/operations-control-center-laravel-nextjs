"use client";

import { useCallback, useEffect, useState } from "react";
import { authEvents } from "@/lib/auth";
import { notificationsEvents } from "@/lib/notificationsEvents";
import { getUnreadNotificationsCountByQuery } from "@/lib/api/notifications";
import { useNotificationRealtime } from "@/hooks/notifications/useNotificationRealtime";

type UseUnreadNotificationsCountParams = {
  userId: number | null;
  enabled?: boolean;
  includeAllTenants?: boolean;
};

export function useUnreadNotificationsCount({
  userId,
  enabled = true,
  includeAllTenants = false,
}: UseUnreadNotificationsCountParams) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshAction = useCallback(async () => {
    if (!enabled || !userId) {
      return;
    }

    try {
      const response = await getUnreadNotificationsCountByQuery({
        all_tenants: includeAllTenants ? true : undefined,
      });
      setUnreadCount(response.data?.count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, [enabled, includeAllTenants, userId]);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshAction();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [enabled, refreshAction, userId]);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const handleTenantChanged = () => {
      void refreshAction();
    };

    window.addEventListener(authEvents.tenantChanged, handleTenantChanged);

    return () => {
      window.removeEventListener(authEvents.tenantChanged, handleTenantChanged);
    };
  }, [enabled, refreshAction, userId]);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const handleNotificationsChanged = () => {
      void refreshAction();
    };

    window.addEventListener(notificationsEvents.changed, handleNotificationsChanged);

    return () => {
      window.removeEventListener(notificationsEvents.changed, handleNotificationsChanged);
    };
  }, [enabled, refreshAction, userId]);

  useNotificationRealtime({
    userId,
    enabled,
    onNotificationAction: () => {
      void refreshAction();
    },
  });

  return {
    unreadCount: enabled && userId ? unreadCount : 0,
    refreshAction,
  };
}
