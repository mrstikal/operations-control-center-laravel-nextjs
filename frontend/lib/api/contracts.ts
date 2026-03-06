import { del, get, post, put } from "./client";
import type { Contract, ContractIncident, ListQuery } from "@/lib/types";

type ContractRequestOptions = {
  skipTenantHeader?: boolean;
};

type ContractScopeQuery = {
  tenant_id?: number;
};

export function listContracts(query?: ListQuery, options?: ContractRequestOptions) {
  return get<Contract[]>("/contracts", query, options);
}

export function getContractById(
  id: number | string,
  query?: ContractScopeQuery,
  options?: ContractRequestOptions
) {
  return get<Contract>(`/contracts/${id}`, query, options);
}

export function createContract(payload: Partial<Contract>) {
  return post<Contract>("/contracts", payload);
}

export function updateContract(id: number | string, payload: Partial<Contract>) {
  return put<Contract>(`/contracts/${id}`, payload);
}

export function deleteContract(id: number | string) {
  return del<null>(`/contracts/${id}`);
}

export function restoreContract(
  id: number | string,
  query?: ContractScopeQuery,
  options?: ContractRequestOptions
) {
  return post<Contract>(`/contracts/${id}/restore${query ? `?tenant_id=${query.tenant_id}` : ""}`, undefined, options);
}

export function hardDeleteContract(
  id: number | string,
  query?: ContractScopeQuery,
  options?: ContractRequestOptions
) {
  return del<null>(`/contracts/${id}/hard-delete${query ? `?tenant_id=${query.tenant_id}` : ""}`, options);
}

export function approveContract(id: number | string) {
  return post<Contract>(`/contracts/${id}/approve`);
}

export function changeContractStatus(id: number | string, status: string, reason?: string) {
  return post<Contract>(`/contracts/${id}/change-status`, { status, reason });
}

export function listContractIncidents(
  contractId: number | string,
  query?: ContractScopeQuery,
  options?: ContractRequestOptions
) {
  return get<ContractIncident[]>(`/contracts/${contractId}/incidents`, query, options);
}

export function createContractIncident(
  contractId: number | string,
  payload: {
    title: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    status?: "open" | "in_review" | "resolved" | "closed";
  },
  query?: ContractScopeQuery,
  options?: ContractRequestOptions
) {
  return post<ContractIncident>(
    `/contracts/${contractId}/incidents${query ? `?tenant_id=${query.tenant_id}` : ""}`,
    payload,
    options
  );
}

export function updateContractIncident(
  contractId: number | string,
  incidentId: number | string,
  payload: {
    title?: string;
    description?: string;
    severity?: "low" | "medium" | "high" | "critical";
    status?: "open" | "in_review" | "resolved" | "closed";
  },
  query?: ContractScopeQuery,
  options?: ContractRequestOptions
) {
  return put<ContractIncident>(
    `/contracts/${contractId}/incidents/${incidentId}${query ? `?tenant_id=${query.tenant_id}` : ""}`,
    payload,
    options
  );
}

export function deleteContractIncident(
  contractId: number | string,
  incidentId: number | string,
  query?: ContractScopeQuery,
  options?: ContractRequestOptions
) {
  return del<null>(
    `/contracts/${contractId}/incidents/${incidentId}${query ? `?tenant_id=${query.tenant_id}` : ""}`,
    options
  );
}
