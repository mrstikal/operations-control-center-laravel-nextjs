"use client";

import { clearToken, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
};

export type Contract = {
  id: number;
  contract_number: string;
  title: string;
  status: string;
  priority: string;
};

export type Incident = {
  id: number;
  incident_number: string;
  title: string;
  severity: string;
  status: string;
};

export type Me = {
  id: number;
  tenant_id: number;
  name: string;
  email: string;
};

export type DashboardSummary = {
  kpi: {
    operational: {
      incidents_total: number;
      incidents_open: number;
      incidents_in_progress: number;
      incidents_escalated: number;
      incidents_resolved_today: number;
      sla_breached: number;
      sla_at_risk: number;
      avg_response_time_minutes: number;
      avg_resolution_time_hours: number;
    };
    business: {
      contracts_total: number;
      contracts_active: number;
      contracts_pending: number;
      contracts_done: number;
      contracts_expiring_30_days: number;
      contracts_overdue: number;
      total_budget: number;
      total_spent: number;
      budget_remaining: number;
      budget_usage_percent: number;
      assets_total: number;
      assets_operational: number;
      assets_maintenance: number;
    };
  };
  summary: {
    critical_incidents: number;
    pending_approvals: number;
    sla_at_risk: number;
  };
  generated_at: string;
};

export type DashboardEvent = {
  id: number;
  type: "contract" | "incident";
  reference: string;
  title: string;
  status: string;
  timestamp: string;
  is_new: boolean;
  action: "created" | "updated";
};

export type DashboardFeedEventApi = {
  id: number;
  type: string;
  entity: string;
  entity_id: number;
  message: string;
  user: { id: number; name: string } | null;
  severity: string;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
};

export type DashboardFeed = {
  events: DashboardFeedEventApi[];
  total: number;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const token = getToken();
  const url = `${API_URL}${path}`;

  //console.log('API Request:', { url, method: options.method || 'GET', token });  // Add this line


  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers: headers,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type");

  // Silent logout on 401
  if (response.status === 401) {
    clearToken();

    if (typeof window !== "undefined") {
      const isAlreadyOnLogin = window.location.pathname.startsWith("/login");
      if (!isAlreadyOnLogin) {
        window.location.replace("/login");
      }
    }

    throw new Error("Unauthenticated.");
  }

  // Debug logging
  if (!response.ok || !contentType?.includes("application/json")) {
    const text = await response.text();
    console.error("API Error:", {
      url,
      status: response.status,
      contentType,
      responseText: text.substring(0, 500),
    });

    if (!contentType?.includes("application/json")) {
      throw new Error(`API returned HTML instead of JSON. URL: ${path}`);
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "API error");
  }

  return data;
}

export function login(email: string, password: string) {
  return request<{ token: string; user: { id: number; name: string; email: string } }>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getMe() {
  return request<Me>("/me");
}

function withPerPage(path: string, perPage?: number) {
  if (!perPage) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}per_page=${perPage}`;
}

export function getContracts(perPage?: number) {
  return request<Contract[]>(withPerPage("/contracts", perPage));
}

export function getIncidents(perPage?: number) {
  return request<Incident[]>(withPerPage("/incidents", perPage));
}

export function getDashboardSummary() {
  return request<DashboardSummary>("/dashboard/summary");
}

export function getDashboardFeed(limit = 20) {
  return request<DashboardFeed>(`/dashboard/feed?limit=${limit}`);
}
