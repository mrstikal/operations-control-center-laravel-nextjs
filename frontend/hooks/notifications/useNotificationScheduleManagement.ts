"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteNotificationSchedule,
  listNotificationSchedules,
} from "@/lib/api/notificationSchedules";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import type { NotificationSchedule, Pagination } from "@/lib/types";

const INITIAL_PAGINATION: Pagination = {
  total: 0,
  per_page: 20,
  current_page: 1,
  last_page: 1,
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useNotificationScheduleManagement() {
  const router = useRouter();
  const { user, loading: currentUserLoading } = useCurrentUser();
  const { isReadOnly } = useTenantReadOnly(user);
  const { errorAction, successAction, infoAction } = useToast();

  const [schedules, setSchedules] = useState<NotificationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [pagination, setPagination] = useState<Pagination>(INITIAL_PAGINATION);
  const [filters, setFilters] = useState<Record<string, string>>({
    trigger: "",
    is_active: "",
  });

  const loadSchedulesAction = useCallback(async () => {
    try {
      setLoading(true);

      const response = await listNotificationSchedules({
        trigger: filters.trigger || undefined,
        is_active: filters.is_active
          ? (filters.is_active as "1" | "0" | "true" | "false")
          : undefined,
        page,
        per_page: perPage,
      });

      setSchedules(Array.isArray(response.data) ? response.data : []);
      setPagination(
        response.pagination ?? {
          total: Array.isArray(response.data) ? response.data.length : 0,
          per_page: perPage,
          current_page: page,
          last_page: 1,
        }
      );
    } catch (error) {
      setSchedules([]);
      setPagination({
        total: 0,
        per_page: perPage,
        current_page: page,
        last_page: 1,
      });
      errorAction(getErrorMessage(error, "Failed to load notification schedules"));
    } finally {
      setLoading(false);
    }
  }, [errorAction, filters.is_active, filters.trigger, page, perPage]);

  useEffect(() => {
    void loadSchedulesAction();
  }, [loadSchedulesAction]);

  const handleFilterChangeAction = useCallback((nextFilters: Record<string, string>) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const viewCreatePageAction = useCallback(() => {
    if (isReadOnly) {
      infoAction("This tenant is read-only.");
      return;
    }

    router.push("/notification-schedules/create");
  }, [infoAction, isReadOnly, router]);

  const viewEditPageAction = useCallback(
    (schedule: NotificationSchedule) => {
      if (isReadOnly) {
        infoAction("This tenant is read-only.");
        return;
      }

      router.push(`/notification-schedules/${schedule.id}/edit`);
    },
    [infoAction, isReadOnly, router]
  );

  const deleteScheduleAction = useCallback(
    async (schedule: NotificationSchedule) => {
      if (isReadOnly) {
        infoAction("This tenant is read-only.");
        return;
      }

      const confirmed = window.confirm(
        `Delete schedule "${schedule.name}"? This action cannot be undone.`
      );
      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(schedule.id);
        await deleteNotificationSchedule(schedule.id);
        successAction("Notification schedule deleted");
        await loadSchedulesAction();
      } catch (error) {
        errorAction(getErrorMessage(error, "Failed to delete notification schedule"));
      } finally {
        setDeletingId(null);
      }
    },
    [errorAction, infoAction, isReadOnly, loadSchedulesAction, successAction]
  );

  return {
    schedules,
    loading: loading || currentUserLoading,
    deletingId,
    page,
    perPage,
    pagination,
    filters,
    isReadOnly,
    setPage,
    setPerPage,
    handleFilterChangeAction,
    viewCreatePageAction,
    viewEditPageAction,
    deleteScheduleAction,
  };
}

