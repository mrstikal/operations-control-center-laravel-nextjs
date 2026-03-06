import { del, get, post, put } from "./client";

export type Department = {
  id: number;
  tenant_id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  assigned_employees_count?: number;
  created_at?: string;
  updated_at?: string;
};

export function listDepartments(query?: Record<string, string | number | boolean | undefined>) {
  return get<Department[]>("/departments", query);
}

export function createDepartment(payload: Partial<Department>) {
  return post<Department>("/departments", payload);
}

export function updateDepartment(id: number | string, payload: Partial<Department>) {
  return put<Department>(`/departments/${id}`, payload);
}

export function deleteDepartment(id: number | string, targetDepartmentId?: number) {
  const url = `/departments/${id}`;
  if (targetDepartmentId) {
    return post<{ reassigned_count: number; target_department: string }>(url, {
      _method: "DELETE",
      target_department_id: targetDepartmentId,
    });
  }
  return del<null>(url);
}
