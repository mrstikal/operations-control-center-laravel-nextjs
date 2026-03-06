"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getNotificationById, markNotificationRead } from "@/lib/api/notifications";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { notifyNotificationsChanged } from "@/lib/notificationsEvents";
import type { Notification } from "@/lib/types";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useNotificationDetail(notificationId: string) {
  const router = useRouter();
  const { user, loading: currentUserLoading } = useCurrentUser();
  const { isReadOnly } = useTenantReadOnly(user);

  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  const actionUrl = useMemo(() => notification?.action_url ?? null, [notification?.action_url]);

  const loadNotificationAction = useCallback(async () => {
    if (!notificationId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getNotificationById(notificationId);
      setNotification(response.data ?? null);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load notification"));
      setNotification(null);
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    void loadNotificationAction();
  }, [loadNotificationAction]);

  const goBackAction = useCallback(() => {
    router.push("/notifications");
  }, [router]);

  const openActionUrlAction = useCallback(() => {
    if (!actionUrl) {
      return;
    }

    router.push(actionUrl);
  }, [actionUrl, router]);

  const markReadAction = useCallback(async () => {
    if (!notification || notification.read || isReadOnly) {
      return;
    }

    try {
      setMarkingRead(true);
      const response = await markNotificationRead(notification.id);
      setNotification(response.data ?? null);
      notifyNotificationsChanged();
    } catch (markError) {
      setError(getErrorMessage(markError, "Failed to mark notification as read"));
    } finally {
      setMarkingRead(false);
    }
  }, [isReadOnly, notification]);

  return {
    notification,
    loading: loading || currentUserLoading,
    error,
    actionUrl,
    isReadOnly,
    markingRead,
    goBackAction,
    openActionUrlAction,
    markReadAction,
    reloadAction: loadNotificationAction,
  };
}

