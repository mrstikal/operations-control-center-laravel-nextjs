import { get, post } from "@/lib/api/client";
import type {
  ApiEnvelope,
  Notification,
  NotificationListQuery,
  NotificationUnreadCount,
} from "@/lib/types";

export async function listNotifications(
  query?: NotificationListQuery
): Promise<ApiEnvelope<Notification[]>> {
  return get<Notification[]>("/notifications", query);
}

export async function getNotificationById(
  id: number | string
): Promise<ApiEnvelope<Notification>> {
  return get<Notification>(`/notifications/${id}`);
}

export async function markNotificationRead(
  id: number | string
): Promise<ApiEnvelope<Notification>> {
  return post<Notification>(`/notifications/${id}/mark-read`);
}

export async function markAllNotificationsRead(): Promise<
  ApiEnvelope<{ updated_count: number }>
> {
  return post<{ updated_count: number }>("/notifications/mark-all-read");
}

export async function getUnreadNotificationsCount(): Promise<
  ApiEnvelope<NotificationUnreadCount>
> {
  return get<NotificationUnreadCount>("/notifications/unread-count");
}

export async function getUnreadNotificationsCountByQuery(query?: {
  user_id?: number;
  all_tenants?: boolean;
}): Promise<ApiEnvelope<NotificationUnreadCount>> {
  return get<NotificationUnreadCount>("/notifications/unread-count", query);
}

