"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createNotificationSchedule,
  getNotificationScheduleById,
  updateNotificationSchedule,
} from "@/lib/api/notificationSchedules";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import type {
  NotificationConditions,
  NotificationRecipients,
  NotificationSchedule,
  NotificationSchedulePayload,
} from "@/lib/types";

type UseNotificationScheduleFormParams = {
  mode: "create" | "edit";
  scheduleId?: string;
};

const DEFAULT_RECIPIENTS: NotificationRecipients = {
  schema_version: 1,
  channels: ["in_app"],
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function tryParseJson<T>(value: string, fallback: T): T {
  if (!value.trim()) {
    return fallback;
  }

  return JSON.parse(value) as T;
}

export function useNotificationScheduleForm({ mode, scheduleId }: UseNotificationScheduleFormParams) {
  const router = useRouter();
  const { user, loading: currentUserLoading } = useCurrentUser();
  const { isReadOnly } = useTenantReadOnly(user);
  const { errorAction, successAction, infoAction } = useToast();

  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<NotificationSchedule | null>(null);

  const [name, setName] = useState("");
  const [notificationType, setNotificationType] = useState("");
  const [trigger, setTrigger] = useState("incident_assigned");
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["Manager"]);
  const [dedupeTtlMinutes, setDedupeTtlMinutes] = useState(30);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [conditionsJson, setConditionsJson] = useState("");
  const [recipientsJson, setRecipientsJson] = useState(JSON.stringify(DEFAULT_RECIPIENTS, null, 2));

  const isEditMode = mode === "edit";

  const loadScheduleAction = useCallback(async () => {
    if (!isEditMode || !scheduleId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getNotificationScheduleById(scheduleId);
      const loaded = response.data;

      setSchedule(loaded);
      setName(loaded.name);
      setNotificationType(loaded.notification_type);
      setTrigger(loaded.trigger);
      setIsActive(Boolean(loaded.is_active));
      setConditionsJson(
        loaded.conditions ? JSON.stringify(loaded.conditions, null, 2) : ""
      );
      setRecipientsJson(
        loaded.recipients
          ? JSON.stringify(loaded.recipients, null, 2)
          : JSON.stringify(DEFAULT_RECIPIENTS, null, 2)
      );

      const roleList = loaded.recipients?.roles;
      setSelectedRoles(Array.isArray(roleList) && roleList.length > 0 ? roleList : ["Manager"]);
      setDedupeTtlMinutes(loaded.recipients?.dedupe?.ttl_minutes ?? 30);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load notification schedule"));
    } finally {
      setLoading(false);
    }
  }, [isEditMode, scheduleId]);

  useEffect(() => {
    void loadScheduleAction();
  }, [loadScheduleAction]);

  const parsedConditions = useMemo(() => {
    try {
      return conditionsJson.trim()
        ? tryParseJson<NotificationConditions | null>(conditionsJson, null)
        : null;
    } catch {
      return undefined;
    }
  }, [conditionsJson]);

  const parsedRecipients = useMemo(() => {
    try {
      return tryParseJson<NotificationRecipients>(recipientsJson, DEFAULT_RECIPIENTS);
    } catch {
      return undefined;
    }
  }, [recipientsJson]);

  const basicConditions = useMemo<NotificationConditions | null>(() => {
    switch (trigger) {
      case "maintenance_due":
        return {
          schema_version: 1,
          rules: [{ field: "days_until_due", operator: "lte", value: 7 }],
          window: { lookback_minutes: 60 },
        };
      case "sla_breach":
        return {
          schema_version: 1,
          rules: [
            { field: "sla_breached", operator: "eq", value: true },
            { field: "severity", operator: "in", value: ["high", "critical"] },
          ],
          window: { lookback_minutes: 15 },
        };
      case "contract_status_changed":
        return {
          schema_version: 1,
          rules: [{ field: "status", operator: "in", value: ["blocked", "in_progress", "done"] }],
        };
      case "asset_retired":
        return {
          schema_version: 1,
          rules: [{ field: "asset_status", operator: "eq", value: "retired" }],
        };
      case "incident_assigned":
      default:
        return {
          schema_version: 1,
          rules: [{ field: "status", operator: "in", value: ["open", "in_progress", "escalated"] }],
          window: { lookback_minutes: 20 },
        };
    }
  }, [trigger]);

  const basicRecipients = useMemo<NotificationRecipients>(() => {
    return {
      schema_version: 1,
      roles: selectedRoles,
      channels: ["in_app"],
      dedupe: {
        strategy: "per_user_per_trigger",
        ttl_minutes: dedupeTtlMinutes,
      },
    };
  }, [dedupeTtlMinutes, selectedRoles]);

  const submitAction = useCallback(async () => {
    if (isReadOnly) {
      infoAction("This tenant is read-only.");
      return;
    }

    if (!name.trim() || !notificationType.trim() || !trigger.trim()) {
      setError("Name, notification type, and trigger are required.");
      return;
    }

    if (advancedMode && parsedConditions === undefined) {
      setError("Conditions JSON is invalid.");
      return;
    }

    if (advancedMode && parsedRecipients === undefined) {
      setError("Recipients JSON is invalid.");
      return;
    }

    if (!advancedMode && selectedRoles.length === 0) {
      setError("Select at least one recipient role.");
      return;
    }

    const payload: NotificationSchedulePayload = {
      name: name.trim(),
      notification_type: notificationType.trim() || trigger.trim(),
      trigger: trigger.trim(),
      conditions: advancedMode ? (parsedConditions ?? null) : basicConditions,
      recipients: advancedMode ? parsedRecipients! : basicRecipients,
      is_active: isActive,
    };

    try {
      setSubmitting(true);
      setError(null);

      if (isEditMode && scheduleId) {
        await updateNotificationSchedule(scheduleId, payload);
        successAction("Notification schedule updated");
      } else {
        await createNotificationSchedule(payload);
        successAction("Notification schedule created");
      }

      router.push("/notification-schedules");
    } catch (submitError) {
      const message = getErrorMessage(submitError, "Failed to save notification schedule");
      setError(message);
      errorAction(message);
    } finally {
      setSubmitting(false);
    }
  }, [
    errorAction,
    advancedMode,
    basicConditions,
    basicRecipients,
    infoAction,
    isActive,
    isEditMode,
    isReadOnly,
    name,
    notificationType,
    parsedConditions,
    parsedRecipients,
    router,
    scheduleId,
    selectedRoles.length,
    successAction,
    trigger,
  ]);

  const cancelAction = useCallback(() => {
    router.push("/notification-schedules");
  }, [router]);

  return {
    schedule,
    loading: loading || currentUserLoading,
    submitting,
    error,
    isReadOnly,
    isEditMode,
    name,
    notificationType,
    trigger,
    isActive,
    selectedRoles,
    dedupeTtlMinutes,
    advancedMode,
    conditionsJson,
    recipientsJson,
    setName,
    setNotificationType,
    setTrigger,
    setIsActive,
    setSelectedRoles,
    setDedupeTtlMinutes,
    setAdvancedMode,
    setConditionsJson,
    setRecipientsJson,
    submitAction,
    cancelAction,
  };
}

