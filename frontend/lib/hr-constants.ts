/**
 * Central UI constants for the HR module.
 *
 * NOTE: Data values (departments, statuses, types) are loaded from the database
 * via the `useHRMetadata()` hook. This file contains UI-specific constants only.
 *
 * @see `useHRMetadata` in `lib/hooks/useHRMetadata.ts`
 */

/**
 * Colors for availability statuses (Tailwind classes).
 */
export const AVAILABILITY_STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  on_leave: "bg-yellow-100 text-yellow-800",
  on_maintenance: "bg-blue-100 text-blue-800",
  unavailable: "bg-red-100 text-red-800",
};

/**
 * Colors for time-off statuses (Tailwind classes).
 */
export const TIME_OFF_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

/**
 * Days of the week for shift management.
 * These are universal constants and do not require database data.
 */
export const DAYS_OF_WEEK = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;
