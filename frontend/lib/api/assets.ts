import { del, get, patch, post, put } from "./client";
import type {
  Asset,
  AssetAuditTrailItem,
  AssetAuditTrailQuery,
  CreateMaintenanceLogPayload,
  CreateMaintenanceSchedulePayload,
  GlobalMaintenanceLogQuery,
  GlobalMaintenanceScheduleQuery,
  ListQuery,
  MaintenanceLog,
  MaintenanceLogQuery,
  MaintenanceSchedule,
  MaintenanceScheduleQuery,
  UpdateMaintenanceLogPayload,
  UpdateMaintenanceSchedulePayload,
} from "@/lib/types";

type ListAssetsOptions = {
  skipTenantHeader?: boolean;
};

export function listAssets(query?: ListQuery, options?: ListAssetsOptions) {
  return get<Asset[]>("/assets", query, options);
}

export function getAssetById(id: number | string) {
  return get<Asset>(`/assets/${id}`);
}

export function createAsset(payload: Partial<Asset>) {
  return post<Asset>("/assets", payload);
}

export function updateAsset(id: number | string, payload: Partial<Asset> & { reason?: string }) {
  return put<Asset>(`/assets/${id}`, payload);
}

export function deleteAsset(id: number | string, reason: string) {
  return del<null>(`/assets/${id}?reason=${encodeURIComponent(reason)}`);
}

export function restoreAsset(id: number | string, reason: string) {
  return post<Asset>(`/assets/${id}/restore`, { reason });
}

export function hardDeleteAsset(id: number | string, reason: string) {
  return del<null>(`/assets/${id}/hard-delete?reason=${encodeURIComponent(reason)}`);
}

export function updateAssetStatus(id: number | string, status: string, reason?: string) {
  return put<Asset>(`/assets/${id}`, { status, reason });
}

export function getAssetAuditTrail(id: number | string, query?: AssetAuditTrailQuery) {
  return get<AssetAuditTrailItem[]>(`/assets/${id}/audit-trail`, query);
}

export function listAssetMaintenanceLogs(id: number | string, query?: MaintenanceLogQuery) {
  return get<MaintenanceLog[]>(`/assets/${id}/maintenance-logs`, query);
}

export function listMaintenanceLogs(query?: GlobalMaintenanceLogQuery) {
  return get<MaintenanceLog[]>("/maintenance-logs", query);
}

export function createAssetMaintenanceLog(
  id: number | string,
  payload: CreateMaintenanceLogPayload
) {
  return post<{ asset: Asset; maintenance_log: MaintenanceLog }>(`/assets/${id}/maintenance-logs`, payload);
}

export function updateAssetMaintenanceLog(
  id: number | string,
  logId: number | string,
  payload: UpdateMaintenanceLogPayload
) {
  return patch<{ maintenance_log: MaintenanceLog }>(`/assets/${id}/maintenance-logs/${logId}`, payload);
}

export function deleteAssetMaintenanceLog(id: number | string, logId: number | string) {
  return del<null>(`/assets/${id}/maintenance-logs/${logId}`);
}

export function listAssetMaintenanceSchedules(id: number | string, query?: MaintenanceScheduleQuery) {
  return get<MaintenanceSchedule[]>(`/assets/${id}/maintenance-schedules`, query);
}

export function listMaintenanceSchedules(query?: GlobalMaintenanceScheduleQuery) {
  return get<MaintenanceSchedule[]>("/maintenance-schedules", query);
}

export function createAssetMaintenanceSchedule(
  id: number | string,
  payload: CreateMaintenanceSchedulePayload
) {
  return post<{ schedule: MaintenanceSchedule }>(`/assets/${id}/maintenance-schedules`, payload);
}

export function updateAssetMaintenanceSchedule(
  id: number | string,
  scheduleId: number | string,
  payload: UpdateMaintenanceSchedulePayload
) {
  return patch<{ schedule: MaintenanceSchedule }>(
    `/assets/${id}/maintenance-schedules/${scheduleId}`,
    payload
  );
}

export function deleteAssetMaintenanceSchedule(id: number | string, scheduleId: number | string) {
  return del<null>(`/assets/${id}/maintenance-schedules/${scheduleId}`);
}

export function retireAsset(id: number | string, reason: string, retirement_date?: string) {
  return post<Asset>(`/assets/${id}/retire`, { reason, retirement_date });
}

export function disposeAsset(
  id: number | string,
  reason: string,
  disposal_method?: string,
  disposal_date?: string
) {
  return post<Asset>(`/assets/${id}/dispose`, { reason, disposal_method, disposal_date });
}

export function transferAsset(
  id: number | string,
  payload: { location: string; department?: string; reason: string }
) {
  return post<Asset>(`/assets/${id}/transfer`, payload);
}

export function reassignAsset(
  id: number | string,
  payload: { assigned_to?: number; reason: string }
) {
  return post<Asset>(`/assets/${id}/reassign`, payload);
}
