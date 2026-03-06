"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getUnreadNotificationsCountByQuery,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { listUsers, type User as ApiUser } from "@/lib/api/users";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import type { Notification, Pagination } from "@/lib/types";
import { notifyNotificationsChanged } from "@/lib/notificationsEvents";
import { useNotificationRealtime } from "@/hooks/notifications/useNotificationRealtime";

const INITIAL_PAGINATION: Pagination = {
  total: 0,
  per_page: 20,
  current_page: 1,
  last_page: 1,
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useNotificationManagement() {
  const router = useRouter();
  const { user, loading: currentUserLoading } = useCurrentUser();
  const { isReadOnly } = useTenantReadOnly(user);
  const { errorAction, successAction, infoAction } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [pagination, setPagination] = useState<Pagination>(INITIAL_PAGINATION);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [users, setUsers] = useState<ApiUser[]>([]);

  const [filters, setFilters] = useState<Record<string, string>>({
    read: "",
    type: "",
    priority: "",
    user_id: "",
  });

  const canFilterByUser = Boolean(user?.can_filter_by_tenant);

  const loadNotificationsAction = useCallback(async () => {
    try {
      setLoading(true);

      const response = await listNotifications({
        read: (filters.read || "") as "1" | "0" | "true" | "false" | "",
        type: filters.type || undefined,
        priority: (filters.priority || "") as "low" | "medium" | "high" | "critical" | "",
        user_id: canFilterByUser && filters.user_id ? Number(filters.user_id) : undefined,
        all_tenants: canFilterByUser ? true : undefined,
        page,
        per_page: perPage,
      });

      setNotifications(Array.isArray(response.data) ? response.data : []);
      setPagination(
        response.pagination ?? {
          total: Array.isArray(response.data) ? response.data.length : 0,
          per_page: perPage,
          current_page: page,
          last_page: 1,
        }
      );
    } catch (error) {
      setNotifications([]);
      setPagination({
        total: 0,
        per_page: perPage,
        current_page: page,
        last_page: 1,
      });
      errorAction(getErrorMessage(error, "Failed to load notifications"));
    } finally {
      setLoading(false);
    }
  }, [
    canFilterByUser,
    errorAction,
    filters.priority,
    filters.read,
    filters.type,
    filters.user_id,
    page,
    perPage,
  ]);

  const loadUnreadCountAction = useCallback(async () => {
    try {
      const response = await getUnreadNotificationsCountByQuery({
        user_id: canFilterByUser && filters.user_id ? Number(filters.user_id) : undefined,
        all_tenants: canFilterByUser ? true : undefined,
      });
      setUnreadCount(response.data?.count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, [canFilterByUser, filters.user_id]);

  useEffect(() => {
    async function loadUsersAction() {
      if (!canFilterByUser) {
        setUsers([]);
        return;
      }

      try {
        const response = await listUsers({ per_page: 200 });
        setUsers(Array.isArray(response.data) ? response.data : []);
      } catch {
        setUsers([]);
      }
    }

    void loadUsersAction();
  }, [canFilterByUser]);

  useEffect(() => {
    void loadNotificationsAction();
  }, [loadNotificationsAction, refreshTick]);

  useEffect(() => {
    void loadUnreadCountAction();
  }, [loadUnreadCountAction, refreshTick]);

  const handleFilterChangeAction = useCallback((nextFilters: Record<string, string>) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const viewNotificationAction = useCallback(
    (notification: Notification) => {
      router.push(`/notifications/${notification.id}`);
    },
    [router]
  );

  const markReadAction = useCallback(
    async (notification: Notification) => {
      if (notification.read) {
        return;
      }

      try {
        await markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read: true,
                  read_at: new Date().toISOString(),
                }
              : item
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        notifyNotificationsChanged();
      } catch (error) {
        errorAction(getErrorMessage(error, "Failed to mark notification as read"));
      }
    },
    [errorAction]
  );

  const markAllReadAction = useCallback(async () => {
    if (isReadOnly) {
      infoAction("This tenant is read-only.");
      return;
    }

    try {
      const response = await markAllNotificationsRead();
      const updatedCount = response.data?.updated_count ?? 0;

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          read: true,
          read_at: item.read_at ?? new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
      notifyNotificationsChanged();
      successAction(`${updatedCount} notifications marked as read`);
    } catch (error) {
      errorAction(getErrorMessage(error, "Failed to mark all notifications as read"));
    }
  }, [errorAction, infoAction, isReadOnly, successAction]);

  const handleRealtimeNotificationAction = useCallback(() => {
    setRefreshTick((prev) => prev + 1);
  }, []);

  useNotificationRealtime({
    userId: user?.id ?? null,
    onNotificationAction: handleRealtimeNotificationAction,
  });

  return {
    notifications,
    loading: loading || currentUserLoading,
    page,
    perPage,
    pagination,
    filters,
    users,
    canFilterByUser,
    unreadCount,
    isReadOnly,
    setPage,
    setPerPage,
    handleFilterChangeAction,
    viewNotificationAction,
    markReadAction,
    markAllReadAction,
  };
}

