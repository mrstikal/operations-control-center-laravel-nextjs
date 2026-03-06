import { del, get, post, put } from "@/lib/api/client";
import type {
  ApiEnvelope,
  NotificationSchedule,
  NotificationScheduleListQuery,
  NotificationSchedulePayload,
} from "@/lib/types";

export async function listNotificationSchedules(
  query?: NotificationScheduleListQuery
): Promise<ApiEnvelope<NotificationSchedule[]>> {
  return get<NotificationSchedule[]>("/notification-schedules", query);
}

export async function getNotificationScheduleById(
  id: number | string
): Promise<ApiEnvelope<NotificationSchedule>> {
  return get<NotificationSchedule>(`/notification-schedules/${id}`);
}

export async function createNotificationSchedule(
  payload: NotificationSchedulePayload
): Promise<ApiEnvelope<NotificationSchedule>> {
  return post<NotificationSchedule>("/notification-schedules", payload);
}

export async function updateNotificationSchedule(
  id: number | string,
  payload: Partial<NotificationSchedulePayload>
): Promise<ApiEnvelope<NotificationSchedule>> {
  return put<NotificationSchedule>(`/notification-schedules/${id}`, payload);
}

export async function deleteNotificationSchedule(
  id: number | string
): Promise<ApiEnvelope<{ deleted: boolean }>> {
  return del<{ deleted: boolean }>(`/notification-schedules/${id}`);
}

