import { del, get, post, put } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/types";

export interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  description?: string;
  is_active: boolean;
  employees?: EmployeeShiftAssignment[];
}

export interface EmployeeShiftAssignment {
  id: number;
  employee_id: number;
  shift_id: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  employee: {
    id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
}

export function listShifts(): Promise<ApiEnvelope<Shift[]>> {
  return get("/shifts");
}

export function getShift(id: number): Promise<ApiEnvelope<Shift>> {
  return get(`/shifts/${id}`);
}

export function createShift(data: Omit<Shift, "id">): Promise<ApiEnvelope<Shift>> {
  return post("/shifts", data);
}

export function updateShift(id: number, data: Partial<Shift>): Promise<ApiEnvelope<Shift>> {
  return put(`/shifts/${id}`, data);
}

export function deleteShift(id: number): Promise<ApiEnvelope<null>> {
  return del(`/shifts/${id}`);
}

export function assignEmployeesToShift(
  shiftId: number,
  employeeIds: number[],
  startDate: string,
  endDate?: string
): Promise<ApiEnvelope<EmployeeShiftAssignment[]>> {
  return post(`/shifts/${shiftId}/assign`, {
    employee_ids: employeeIds,
    start_date: startDate,
    end_date: endDate,
  });
}

export function removeEmployeeShiftAssignment(assignmentId: number): Promise<ApiEnvelope<null>> {
  return del(`/employee-shifts/${assignmentId}`);
}
