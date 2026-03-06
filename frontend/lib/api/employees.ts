import { del, get, post, put } from "./client";
import type { Employee, ListQuery } from "@/lib/types";

export function listEmployees(query?: ListQuery) {
  return get<Employee[]>("/employees", query);
}

export function getEmployeeById(id: number | string) {
  return get<Employee>(`/employees/${id}`);
}

export function createEmployee(payload: Partial<Employee>) {
  return post<Employee>("/employees", payload);
}

export function updateEmployee(id: number | string, payload: Partial<Employee>) {
  return put<Employee>(`/employees/${id}`, payload);
}

export function deleteEmployee(id: number | string) {
  return del<null>(`/employees/${id}`);
}

export function restoreEmployee(id: number | string) {
  return post<Employee>(`/employees/${id}/restore`);
}

export function hardDeleteEmployee(id: number | string) {
  return del<null>(`/employees/${id}/hard-delete`);
}
