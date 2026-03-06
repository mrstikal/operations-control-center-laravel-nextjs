"use client";

import { useEffect } from "react";
import { getEcho } from "@/lib/realtime";

type NotificationRealtimeEvent = {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown> | null;
  created_at: string;
};

type UseNotificationRealtimeParams = {
  userId: number | null;
  enabled?: boolean;
  onNotificationAction: (event: NotificationRealtimeEvent) => void;
};

export function useNotificationRealtime({
  userId,
  enabled = true,
  onNotificationAction,
}: UseNotificationRealtimeParams) {
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const echo = getEcho();
    if (!echo) {
      return;
    }

    const channelName = `user.${userId}`;
    const channel = echo.private(channelName);

    channel.listen(".notification.sent", (payload: NotificationRealtimeEvent) => {
      onNotificationAction(payload);
    });

    return () => {
      echo.leave(channelName);
    };
  }, [enabled, onNotificationAction, userId]);
}

