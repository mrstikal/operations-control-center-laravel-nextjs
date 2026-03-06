import type { HTMLAttributes } from "react";

export type MaterialIconName =
  | "account_balance_wallet"
  | "add_circle"
  | "admin_panel_settings"
  | "alarm"
  | "bolt"
  | "description"
  | "error"
  | "folder_open"
  | "help"
  | "monitoring"
  | "notifications"
  | "payments"
  | "priority_high"
  | "settings"
  | "sync"
  | "task_alt"
  | "timer"
  | "trending_down"
  | "trending_flat"
  | "trending_up"
  | "visibility"
  | "warning"
  | "workspace_premium";

interface MaterialIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: MaterialIconName;
}

export function MaterialIcon({ name, className = "", ...props }: MaterialIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined leading-none ${className}`.trim()}
      {...props}
    >
      {name}
    </span>
  );
}

export const trendIconMap = {
  up: "trending_up",
  down: "trending_down",
  stable: "trending_flat",
} as const;

export const kpiIconMap = {
  contracts_total: "description",
  contracts_done: "task_alt",
  contracts_in_progress: "settings",
  contracts_overdue: "alarm",
  incidents_total: "warning",
  incidents_open: "folder_open",
  incidents_escalated: "priority_high",
  incidents_sla_breached: "error",
  budget_usage_percent: "account_balance_wallet",
  active_contracts_value: "payments",
  avg_incident_resolution_hours: "timer",
} as const;

export const activityActionIconMap = {
  created: "add_circle",
  updated: "sync",
  resolved: "task_alt",
  escalated: "priority_high",
} as const;

export const roleIconMap = {
  superadmin: "workspace_premium",
  admin: "admin_panel_settings",
  manager: "monitoring",
  operator: "bolt",
  viewer: "visibility",
} as const;

export const genericIcon = "help" as const;
