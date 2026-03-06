"use client";

import { useParams } from "next/navigation";
import { useNotificationDetail } from "@/hooks/notifications/useNotificationDetail";
import { formatDateTime } from "@/lib/formatters/date";

function renderJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

export default function NotificationDetailPage() {
  const params = useParams();
  const notificationId = params.id as string;

  const {
    notification,
    loading,
    error,
    actionUrl,
    isReadOnly,
    markingRead,
    goBackAction,
    openActionUrlAction,
    markReadAction,
  } = useNotificationDetail(notificationId);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4 text-slate-600">Loading...</div>
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          {error || "Notification not found"}
        </div>
        <button
          type="button"
          onClick={goBackAction}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back to notifications
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification detail</h1>
          <p className="text-slate-600">Inspect payload and linked resource context.</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={goBackAction}
            className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Back
          </button>

          {!notification.read && (
            <button
              type="button"
              onClick={() => {
                void markReadAction();
              }}
              disabled={markingRead || isReadOnly}
              className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingRead ? "Marking..." : "Mark as read"}
            </button>
          )}

          {actionUrl && (
            <button
              type="button"
              onClick={openActionUrlAction}
              className="rounded-sm bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
            >
              Open target
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Message</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-600">Title</label>
                <p className="mt-1 text-slate-900">{notification.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Message</label>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{notification.message}</p>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Payload data</h2>
            <pre className="overflow-x-auto rounded-sm bg-slate-50 p-4 text-xs text-slate-800">
              {renderJson(notification.data ?? {})}
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Meta</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>ID:</strong> {notification.id}
              </p>
              <p>
                <strong>Type:</strong> {notification.type}
              </p>
              <p>
                <strong>Priority:</strong> {notification.priority}
              </p>
              <p>
                <strong>Status:</strong> {notification.read ? "Read" : "Unread"}
              </p>
              <p>
                <strong>Created:</strong> {formatDateTime(notification.created_at)}
              </p>
              <p>
                <strong>Read at:</strong> {notification.read_at ? formatDateTime(notification.read_at) : "-"}
              </p>
            </div>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Linked entity</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Type:</strong> {notification.notifiable_type || "-"}
              </p>
              <p>
                <strong>ID:</strong> {notification.notifiable_id ?? "-"}
              </p>
              <p>
                <strong>Action URL:</strong> {notification.action_url || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

