import { del, get, post, put } from "./client";
import type { Incident, ListQuery } from "@/lib/types";

type ListIncidentsOptions = {
  skipTenantHeader?: boolean;
};

type IncidentScopeQuery = {
  tenant_id?: number;
};

function appendIncidentScope(path: string, query?: IncidentScopeQuery): string {
  if (!query?.tenant_id) {
    return path;
  }

  const params = new URLSearchParams({ tenant_id: String(query.tenant_id) });
  return `${path}?${params.toString()}`;
}

export type IncidentTimelineEvent = {
  id: number;
  event_type: string;
  message: string;
  user?: { id: number; name: string };
  occurred_at: string;
  metadata?: Record<string, unknown>;
};

export type IncidentAssignment = {
  id: number;
  user: { id: number; name: string };
  role: string;
  assigned_at: string;
  unassigned_at?: string;
};

export type IncidentEscalation = {
  id: number;
  escalated_by: { id: number; name: string };
  escalated_to: { id: number; name: string };
  escalation_level: string;
  reason?: string;
  notes?: string | null;
  escalated_at: string;
  resolved_at?: string;
};

export type IncidentComment = {
  id: number;
  user: { id: number; name: string };
  comment: string;
  is_internal: boolean;
  commented_at: string;
};

export function listIncidents(query?: ListQuery, options?: ListIncidentsOptions) {
  return get<Incident[]>("/incidents", query, options);
}

export function getIncidentById(
  id: number | string,
  query?: IncidentScopeQuery,
  options?: ListIncidentsOptions
) {
  return get<Incident>(`/incidents/${id}`, query, options);
}

export function createIncident(payload: Partial<Incident>) {
  return post<Incident>("/incidents", payload);
}

export function updateIncident(id: number | string, payload: Partial<Incident> & { reason?: string }) {
  return put<Incident>(`/incidents/${id}`, payload);
}

export function deleteIncident(id: number | string, query?: IncidentScopeQuery, options?: ListIncidentsOptions) {
  const path = appendIncidentScope(`/incidents/${id}`, query);
  return options ? del<null>(path, options) : del<null>(path);
}

export function restoreIncident(id: number | string, query?: IncidentScopeQuery, options?: ListIncidentsOptions) {
  const path = appendIncidentScope(`/incidents/${id}/restore`, query);
  return options ? post<Incident>(path, undefined, options) : post<Incident>(path);
}

export function hardDeleteIncident(id: number | string, query?: IncidentScopeQuery, options?: ListIncidentsOptions) {
  const path = appendIncidentScope(`/incidents/${id}/hard-delete`, query);
  return options ? del<null>(path, options) : del<null>(path);
}

export function closeIncident(
  id: number | string,
  payload: { resolution_summary?: string },
  query?: IncidentScopeQuery,
  options?: ListIncidentsOptions
) {
  const path = appendIncidentScope(`/incidents/${id}/close`, query);
  return options ? post<Incident>(path, payload, options) : post<Incident>(path, payload);
}

export function escalateIncident(
  id: number | string,
  payload: { escalated_to: number; escalation_level: string; reason: string; notes?: string },
  query?: IncidentScopeQuery,
  options?: ListIncidentsOptions
) {
  const path = appendIncidentScope(`/incidents/${id}/escalate`, query);
  return options ? post<Incident>(path, payload, options) : post<Incident>(path, payload);
}

export function getIncidentTimeline(
  id: number | string,
  query?: IncidentScopeQuery,
  options?: ListIncidentsOptions
) {
  if (query) {
    return get<IncidentTimelineEvent[]>(`/incidents/${id}/timeline`, query, options);
  }

  return get<IncidentTimelineEvent[]>(`/incidents/${id}/timeline`);
}

export function getIncidentAssignments(
  id: number | string,
  query?: IncidentScopeQuery,
  options?: ListIncidentsOptions
) {
  if (query) {
    return get<IncidentAssignment[]>(`/incidents/${id}/assignments`, query, options);
  }

  return get<IncidentAssignment[]>(`/incidents/${id}/assignments`);
}

export function getIncidentEscalations(
  id: number | string,
  query?: IncidentScopeQuery,
  options?: ListIncidentsOptions
) {
  if (query) {
    return get<IncidentEscalation[]>(`/incidents/${id}/escalations`, query, options);
  }

  return get<IncidentEscalation[]>(`/incidents/${id}/escalations`);
}

export function getIncidentComments(
  id: number | string,
  query?: IncidentScopeQuery,
  options?: ListIncidentsOptions
) {
  if (query) {
    return get<IncidentComment[]>(`/incidents/${id}/comments`, query, options);
  }

  return get<IncidentComment[]>(`/incidents/${id}/comments`);
}

export function addIncidentComment(
  id: number | string,
  payload: { comment: string; is_internal?: boolean },
  query?: IncidentScopeQuery,
  options?: ListIncidentsOptions
) {
  const path = appendIncidentScope(`/incidents/${id}/comments`, query);
  return options
    ? post<{ id: number; comment: string; commented_at: string }>(path, payload, options)
    : post<{ id: number; comment: string; commented_at: string }>(path, payload);
}
