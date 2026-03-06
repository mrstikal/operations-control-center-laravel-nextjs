"use client";

const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed";

export function notifyNotificationsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

export const notificationsEvents = {
  changed: NOTIFICATIONS_CHANGED_EVENT,
};

