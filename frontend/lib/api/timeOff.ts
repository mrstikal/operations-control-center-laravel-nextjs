import { get, post, put } from "./client";
import type { ApiEnvelope } from "@/lib/types";

export type TimeOffRequest = {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  reason?: string;
  approval_note?: string;
  requested_at: string;
  decided_at?: string;
  archived_at?: string | null;
  employee_name?: string;
  employee_email?: string;
  employee_department?: string;
  employee_position?: string;
  employee?: {
    user?: {
      id?: number;
      name?: string;
      email?: string;
      roles?: Array<{
        id?: number;
        name?: string;
        level: number;
      }>;
    };
    department?: string;
    position?: string;
  };
  requestedBy?: {
    name?: string;
    email?: string;
  };
  approvedBy?: {
    name?: string;
    email?: string;
  };
};

export type TimeOffListQuery = {
  status?: string;
  type?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: string;
};

export type TimeOffDecisionPayload = {
  status: "approved" | "rejected";
  approval_note?: string;
};

export type TimeOffCreatePayload = {
  employee_id?: number;
  start_date: string;
  end_date: string;
  type: string;
  reason?: string;
};

export async function listTimeOffRequests(
  query?: TimeOffListQuery
): Promise<ApiEnvelope<TimeOffRequest[]>> {
  const nextQuery = { ...(query ?? {}) };

  if (nextQuery.status === "archived") {
    delete nextQuery.status;
    return get<TimeOffRequest[]>("/time-off", { ...nextQuery, show_archived: true });
  }

  return get<TimeOffRequest[]>("/time-off", nextQuery);
}

export async function getTimeOffRequestById(
  id: number | string
): Promise<ApiEnvelope<TimeOffRequest>> {
  return get<TimeOffRequest>(`/time-off/${id}`);
}

export async function decideTimeOffRequest(id: number | string, payload: TimeOffDecisionPayload) {
  return post<TimeOffRequest>(`/time-off/${id}/decide`, payload);
}

export async function archiveTimeOffRequest(id: number | string) {
  return post<TimeOffRequest>(`/time-off/${id}/archive`);
}

export async function createTimeOffRequest(payload: TimeOffCreatePayload) {
  return post<TimeOffRequest>("/time-off", payload);
}

export async function updateTimeOffRequest(
  id: number | string,
  payload: Partial<TimeOffCreatePayload>
) {
  return put<TimeOffRequest>(`/time-off/${id}`, payload);
}
