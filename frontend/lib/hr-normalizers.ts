import type { Employee } from "@/lib/types";
import { formatDate, formatTimeRange, formatDateRange } from "@/lib/formatters/date";

export function getEmployeeDisplayName(employee: Employee): string {
  return employee.user?.name || employee.name || "-";
}

export function getEmployeeDisplayEmail(employee: Employee): string {
  return employee.user?.email || employee.email || "-";
}

export function getEmployeeDisplayPhone(employee: Employee): string {
  return employee.user?.phone || employee.phone || "-";
}

export function getEmployeeDepartmentName(employee: Employee): string {
  const department = employee.department;
  if (typeof department === "string") {
    return department || "-";
  }

  if (department && typeof department === "object" && "name" in department) {
    return (department.name as string) || "-";
  }

  return "-";
}

export function getEmployeeStatus(employee: Employee): string {
  return employee.availability_status || "unavailable";
}

export function getShiftName(item: unknown): string {
  return (item as { shift?: { name?: string } })?.shift?.name || "Assigned shift";
}

export function getShiftTimeRange(item: unknown): string {
  const start = (item as { shift?: { start_time?: string } })?.shift?.start_time;
  const end = (item as { shift?: { end_time?: string } })?.shift?.end_time;
  return formatTimeRange(start, end) || "--:-- – --:--";
}

export function getShiftStartDate(item: unknown): string {
  const date = (item as { start_date?: string })?.start_date;
  return formatDate(date, "short") || "-";
}

export function getShiftEndDate(item: unknown): string {
  const date = (item as { end_date?: string | null })?.end_date;
  return date ? formatDate(date, "short") : "–";
}

export function getTimeOffType(request: unknown): string {
  return ((request as { type?: string })?.type || "other").replace("_", " ").toUpperCase();
}

export function getTimeOffStatus(request: unknown): string {
  return (request as { status?: string })?.status || "pending";
}

export function getTimeOffStart(request: unknown): string {
  const date = (request as { start_date?: string })?.start_date;
  return formatDate(date, "short") || "-";
}

export function getTimeOffEnd(request: unknown): string {
  const date = (request as { end_date?: string })?.end_date;
  return formatDate(date, "short") || "-";
}

export function getTimeOffDateRange(request: unknown): string {
  const start = (request as { start_date?: string })?.start_date;
  const end = (request as { end_date?: string })?.end_date;
  return formatDateRange(start, end) || "-";
}

export function getWorkloadDate(entry: unknown): string {
  const date = (entry as { work_date?: string })?.work_date;
  return formatDate(date, "short") || "-";
}

export function getWorkloadAllocated(entry: unknown): string | number {
  return (entry as { hours_allocated?: number | string })?.hours_allocated ?? 0;
}

export function getWorkloadActual(entry: unknown): string | number {
  return (entry as { hours_actual?: number | string | null })?.hours_actual ?? "-";
}

export function getWorkloadUtilization(entry: unknown): string | number {
  return (entry as { capacity_utilization?: number | string })?.capacity_utilization ?? 0;
}

export function getRequestEmployeeName(row: {
  employee?: { user?: { name?: string } };
  employee_name?: string;
}): string {
  return row.employee?.user?.name || row.employee_name || "-";
}

export function getRequestEmployeeEmail(row: {
  employee?: { user?: { email?: string } };
  employee_email?: string;
}): string {
  return row.employee?.user?.email || row.employee_email || "-";
}

export function getRequestEmployeeDepartment(row: {
  employee?: { department?: string };
  employee_department?: string;
}): string {
  return row.employee?.department || row.employee_department || "-";
}

export function getRequestEmployeePosition(row: {
  employee?: { position?: string };
  employee_position?: string;
}): string {
  return row.employee?.position || row.employee_position || "-";
}
