export type Employee = {
  id: number;
  user_id?: number;
  tenant_id?: number;
  name?: string;
  department?: string | { id?: number; name?: string };
  department_id?: number | null;
  position?: string;
  email?: string;
  phone?: string;
  bio?: string;
  status?: string;
  deleted_at?: string | null;
  hire_date?: string;
  available_hours_per_week?: number;
  utilization_percent?: number;
  skills?: string[];
  certifications?: string[];
  availability_status?: "available" | "on_leave" | "on_maintenance" | "unavailable";
  availability_until?: string;
  this_week_hours?: number;
  pending_timeoff?: number;
  user?: {
    id?: number;
    name?: string;
    email?: string;
    phone?: string | null;
    bio?: string | null;
  };
  tenant?: {
    id?: number;
    name?: string;
  };
};
