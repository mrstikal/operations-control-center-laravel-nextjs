export type Asset = {
  id: number;
  tenant_id?: number;
  asset_tag?: string;
  name: string;
  serial_number?: string;
  description?: string;
  category?: string | { id: number; name: string };
  category_id?: number;
  location?: string;
  department?: string;
  assigned_to_id?: number | null;
  assigned_to?: { id: number; name: string } | null;
  manufacturer?: string;
  model?: string;
  acquisition_date?: string;
  warranty_expiry?: string;
  status: string;
  utilization_percent?: number;
  last_maintenance?: string;
  next_maintenance?: string;
  maintenance_interval_days?: number;
  is_due_for_maintenance?: boolean;
  is_warranty_expired?: boolean;
  days_until_maintenance?: number;
  specifications?: Record<string, unknown>;
  tenant?: { id: number; name: string; deleted_at?: string | null };
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type AssetAuditTrailItem = {
  id: number;
  asset_id: number;
  user_id: number;
  action: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  reason?: string | null;
  action_at: string;
  created_at?: string;
  user?: { id: number; name: string } | null;
};

export type AssetAuditTrailQuery = {
  action?: string;
  user_id?: number | string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
};

export type MaintenanceLog = {
  id: number;
  asset_id: number;
  asset?: { id: number; name: string; asset_tag?: string };
  performed_by: number;
  performed_by_user?: { id: number; name: string };
  type: "preventive" | "corrective" | "inspection" | "repair";
  description: string;
  hours_spent?: number | null;
  cost?: number | null;
  performed_at: string;
  notes?: string | null;
  parts_replaced?: unknown[] | null;
  created_at?: string;
  updated_at?: string;
};

export type MaintenanceSchedule = {
  id: number;
  asset_id: number;
  asset?: { id: number; name: string; asset_tag?: string };
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  interval_days?: number | null;
  description: string;
  next_due_date: string;
  is_active: boolean;
  due_state: "ok" | "due_soon" | "overdue";
  is_overdue?: boolean;
  days_until_due?: number | null;
  last_notified_at?: string | null;
  notification_settings?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type MaintenanceLogQuery = {
  type?: MaintenanceLog["type"];
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
};

export type MaintenanceScheduleQuery = {
  frequency?: MaintenanceSchedule["frequency"];
  is_active?: boolean;
  overdue?: boolean;
  due_state?: MaintenanceSchedule["due_state"];
  asset_id?: number | string;
  due_before?: string;
  page?: number;
  per_page?: number;
};

export type GlobalMaintenanceLogQuery = {
  asset_id?: number | string;
  asset_name?: string;
  type?: MaintenanceLog["type"];
  performed_by?: number | string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
};

export type GlobalMaintenanceScheduleQuery = {
  asset_id?: number | string;
  asset_name?: string;
  frequency?: MaintenanceSchedule["frequency"];
  is_active?: boolean;
  overdue?: boolean;
  due_state?: MaintenanceSchedule["due_state"];
  due_before?: string;
  page?: number;
  per_page?: number;
};

export type CreateMaintenanceLogPayload = {
  type: MaintenanceLog["type"];
  description: string;
  hours_spent?: number;
  cost?: number;
  performed_at?: string;
  notes?: string;
  parts_replaced?: unknown[];
};

export type UpdateMaintenanceLogPayload = Partial<CreateMaintenanceLogPayload>;

export type CreateMaintenanceSchedulePayload = {
  frequency: MaintenanceSchedule["frequency"];
  interval_days?: number;
  description: string;
  next_due_date?: string;
  is_active?: boolean;
  notification_settings?: Record<string, unknown>;
};

export type UpdateMaintenanceSchedulePayload = Partial<CreateMaintenanceSchedulePayload>;

