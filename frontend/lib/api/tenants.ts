import { del, get, post, put } from "./client";
import type { ApiEnvelope } from "../types";

export type Tenant = {
  id: number;
  name: string;
  description?: string | null;
  status?: "active" | "suspended" | "inactive";
  activated_at?: string | null;
  suspended_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type TenantArchiveConflictData = {
  code: "TENANT_HAS_USERS";
  users_count: number;
};

export type TenantTransferUser = {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
};

export type TenantTransferPreparation = {
  users_count: number;
  users: TenantTransferUser[];
  available_tenants: Tenant[];
};

export type TenantArchiveWithTransferResult = {
  moved_users_count: number;
  source_tenant_id: number;
  target_tenant_id: number;
};

export type ApiRequestError = Error & {
  status?: number;
  data?: unknown;
};

export type TenantUpsertPayload = {
  name: string;
  description?: string | null;
  status?: "active" | "suspended" | "inactive";
};

export type TenantManagementQuery = {
  search?: string;
  status?: "active" | "suspended" | "inactive" | "archived";
  sort_by?: "name" | "status" | "created_at";
  sort_order?: "asc" | "desc";
  per_page?: number;
  page?: number;
};

export type TenantListQuery = {
  include_archived?: boolean;
};

export async function listTenants(query?: TenantListQuery): Promise<ApiEnvelope<Tenant[]>> {
  return get<Tenant[]>("/tenants", query);
}

export async function listTenantsForManagement(
  query?: TenantManagementQuery
): Promise<ApiEnvelope<Tenant[]>> {
  return get<Tenant[]>("/tenants/manage", query);
}

export async function createTenant(payload: TenantUpsertPayload) {
  return post<Tenant>("/tenants/manage", payload);
}

export async function updateTenant(id: number | string, payload: Partial<TenantUpsertPayload>) {
  return put<Tenant>(`/tenants/manage/${id}`, payload);
}

export async function archiveTenant(id: number | string) {
  return del<null>(`/tenants/manage/${id}`);
}

export async function getTenantUsersForTransfer(id: number | string) {
  return get<TenantTransferPreparation>(`/tenants/manage/${id}/users-for-transfer`);
}

export async function archiveTenantWithTransfer(
  id: number | string,
  targetTenantId: number | string
) {
  return post<TenantArchiveWithTransferResult>(`/tenants/manage/${id}/archive-with-transfer`, {
    target_tenant_id: Number(targetTenantId),
  });
}

export function isTenantArchiveConflict(error: unknown): error is ApiRequestError {
  if (!error || typeof error !== "object") {
    return false;
  }

  const apiError = error as ApiRequestError;
  if (apiError.status !== 409 || !apiError.data || typeof apiError.data !== "object") {
    return false;
  }

  return (apiError.data as Partial<TenantArchiveConflictData>).code === "TENANT_HAS_USERS";
}

export async function restoreTenant(id: number | string) {
  return post<Tenant>(`/tenants/manage/${id}/restore`);
}
