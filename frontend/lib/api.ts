"use client";

import { get, post } from "@/lib/api/client";
import { listContracts } from "@/lib/api/contracts";
import { listIncidents } from "@/lib/api/incidents";
import type {
  ApiEnvelope,
  Contract,
  DashboardEvent,
  DashboardFeed,
  DashboardFeedEventApi,
  DashboardReadModels,
  DashboardSummary,
  Incident,
  Me,
} from "@/lib/types";

export type {
  ApiEnvelope,
  Contract,
  DashboardEvent,
  DashboardFeed,
  DashboardFeedEventApi,
  DashboardReadModels,
  DashboardSummary,
  Incident,
  Me,
};

type QueryRequestOptions = {
  skipTenantHeader?: boolean;
};

export function login(email: string, password: string) {
  return post<{ user: { id: number; name: string; email: string } }>("/login", {
    email,
    password,
  });
}

export function logout() {
  return post<null>("/logout");
}

export function getMe() {
  return get<Me>("/me");
}

export function setDefaultTenant(tenant_id: number) {
  return post<{ default_tenant_id: number }>("/me/default-tenant", { tenant_id });
}

export function getContracts(
  perPage?: number,
  tenantId?: number,
  allTenants?: boolean,
  options?: QueryRequestOptions
) {
  return listContracts({
    ...(perPage ? { per_page: perPage } : {}),
    ...(tenantId ? { tenant_id: tenantId } : {}),
    ...(allTenants ? { all_tenants: true } : {}),
  }, options);
}

export function getIncidents(
  perPage?: number,
  tenantId?: number,
  allTenants?: boolean,
  options?: QueryRequestOptions
) {
  return listIncidents({
    ...(perPage ? { per_page: perPage } : {}),
    ...(tenantId ? { tenant_id: tenantId } : {}),
    ...(allTenants ? { all_tenants: true } : {}),
  }, options);
}

export function getDashboardSummary(params?: {
  tenant_id?: number;
  archive_status?: "active" | "archived" | "all";
  all_tenants?: boolean;
}, options?: QueryRequestOptions) {
  return get<DashboardSummary>("/dashboard/summary", params, options);
}

export function getDashboardFeed(
  limit = 20,
  params?: {
    tenant_id?: number;
    archive_status?: "active" | "archived" | "all";
    all_tenants?: boolean;
  },
  options?: QueryRequestOptions
): Promise<ApiEnvelope<DashboardFeed>> {
  return get<DashboardFeed>("/dashboard/feed", {
    limit,
    ...(params?.tenant_id ? { tenant_id: params.tenant_id } : {}),
    ...(params?.archive_status ? { archive_status: params.archive_status } : {}),
    ...(params?.all_tenants ? { all_tenants: true } : {}),
  }, options);
}

export type DashboardReadModelsQuery = {
  projections_page?: number;
  snapshots_page?: number;
  per_page?: number;
  projection_name?: string;
  projection_active?: "all" | "active" | "inactive";
  snapshot_aggregate_type?: string;
  tenant_id?: number;
  archive_status?: "active" | "archived" | "all";
  all_tenants?: boolean;
};

export function getDashboardReadModels(
  params?: DashboardReadModelsQuery,
  options?: QueryRequestOptions
): Promise<ApiEnvelope<DashboardReadModels>> {
  return get<DashboardReadModels>("/dashboard/read-models", params, options);
}
