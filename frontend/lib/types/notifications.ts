export type NotificationPriority = "low" | "medium" | "high" | "critical";

export type NotificationChannel = "in_app";

export type ConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "contains"
  | "exists";

export type NotificationConditionRule = {
  field: string;
  operator: ConditionOperator;
  value: unknown;
};

export type NotificationConditions = {
  schema_version: 1;
  rules?: NotificationConditionRule[];
  window?: {
    lookback_minutes?: number;
  };
};

export type NotificationRecipients = {
  schema_version: 1;
  roles?: string[];
  user_ids?: number[];
  channels: NotificationChannel[];
  dedupe?: {
    strategy?: "per_user_per_trigger" | "global_per_trigger";
    ttl_minutes?: number;
  };
};

export type Notification = {
  id: number;
  tenant_id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  notifiable_type?: string | null;
  notifiable_id?: number | null;
  priority: NotificationPriority;
  read: boolean;
  read_at?: string | null;
  action_url?: string | null;
  data?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
};

export type NotificationSchedule = {
  id: number;
  tenant_id: number;
  name: string;
  notification_type: string;
  trigger: string;
  conditions?: NotificationConditions | null;
  recipients?: NotificationRecipients | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type NotificationListQuery = {
  read?: "1" | "0" | "true" | "false" | "";
  type?: string;
  priority?: NotificationPriority | "";
  page?: number;
  per_page?: number;
  user_id?: number;
  all_tenants?: boolean;
};

export type NotificationScheduleListQuery = {
  trigger?: string;
  is_active?: "1" | "0" | "true" | "false" | "";
  page?: number;
  per_page?: number;
};

export type NotificationSchedulePayload = {
  name: string;
  notification_type: string;
  trigger: string;
  conditions?: NotificationConditions | null;
  recipients: NotificationRecipients;
  is_active?: boolean;
};

export type NotificationUnreadCount = {
  count: number;
};

