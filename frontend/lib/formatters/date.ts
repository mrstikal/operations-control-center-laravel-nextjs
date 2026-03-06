/**
 * Centralized date formatting helpers for English-language UI surfaces.
 */

type DateFormat = "short" | "long" | "datetime";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWithOptions(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

function formatRelativeAgo(value: number, unit: "minute" | "hour" | "day"): string {
  const absValue = Math.abs(value);
  const suffix = absValue === 1 ? unit : `${unit}s`;

  return `${absValue} ${suffix} ago`;
}

/**
 * Formats an ISO date string for display.
 *
 * - `short` => `Mar 9, 2024`
 * - `long` => `March 9, 2024`
 * - `datetime` => `Mar 9, 2024, 10:30 AM`
 */
export function formatDate(value: string | null | undefined, format: DateFormat = "short"): string {
  switch (format) {
    case "long":
      return formatWithOptions(value, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    case "datetime":
      return formatWithOptions(value, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

    case "short":
    default:
      return formatWithOptions(value, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
  }
}

/**
 * Formats a date value for `input[type="date"]`.
 */
export function formatDateForInput(value: string | null | undefined): string {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Formats a relative timestamp for UI badges and secondary metadata.
 */
export function formatRelativeTime(value: string | null | undefined): string {
  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffDays) > 7) {
    return formatDate(value, "short");
  }

  if (diffDays >= 2) {
    return `in ${diffDays} days`;
  }

  if (diffDays === 1) {
    return "tomorrow";
  }

  if (diffDays <= -2) {
    return `${Math.abs(diffDays)} days ago`;
  }

  if (diffDays === -1) {
    return "yesterday";
  }

  if (diffHours >= 1) {
    return `in ${diffHours} ${diffHours === 1 ? "hour" : "hours"}`;
  }

  if (diffHours <= -1) {
    return formatRelativeAgo(diffHours, "hour");
  }

  if (diffMinutes >= 1) {
    return `in ${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"}`;
  }

  if (diffMinutes <= -1) {
    return formatRelativeAgo(diffMinutes, "minute");
  }

  return "Just now";
}

/**
 * Formats a time range such as `09:00 – 17:00`.
 */
export function formatTimeRange(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  if (!startTime || !endTime) {
    return "";
  }

  return `${startTime} – ${endTime}`;
}

/**
 * Formats a date range such as `Mar 9, 2024 – Mar 15, 2024`.
 */
export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): string {
  const start = formatDate(startDate, "short");

  if (!start) {
    return "";
  }

  if (!endDate) {
    return start;
  }

  const end = formatDate(endDate, "short");

  if (!end || start === end) {
    return start;
  }

  return `${start} – ${end}`;
}

/**
 * Formats a date and time value.
 */
export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, "datetime");
}

/**
 * Formats a date and falls back to an em dash.
 */
export function formatDateOrDash(value: string | null | undefined): string {
  return formatDate(value, "short") || "—";
}

/**
 * Formats a date/time value and falls back to an em dash.
 */
export function formatDateTimeOrDash(value: string | null | undefined): string {
  return formatDate(value, "datetime") || "—";
}

/**
 * Formats activity timestamps for the activity feed.
 *
 * @example "Just now", "5 minutes ago", "3 hours ago", "2 days ago", "Mar 9, 2024"
 */
export function formatActivityTime(timestamp: string | null | undefined): string {
  const date = parseDate(timestamp);

  if (!timestamp) {
    return "—";
  }

  if (!date) {
    return timestamp;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return formatRelativeAgo(diffMinutes, "minute");
  }

  if (diffHours < 24) {
    return formatRelativeAgo(diffHours, "hour");
  }

  if (diffDays < 7) {
    return formatRelativeAgo(diffDays, "day");
  }

  return formatDate(timestamp, "short") || "—";
}
