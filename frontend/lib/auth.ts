"use client";

const TENANT_KEY = "occ_default_tenant_id";
const ALL_TENANTS_VALUE = "all";
const AUTH_CHANGED_EVENT = "auth:changed";
const TENANT_CHANGED_EVENT = "tenant:changed";

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

function notifyTenantChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TENANT_CHANGED_EVENT));
  }
}

export function setToken(token: string) {
  void token;
  // Session je ulozena v HttpOnly cookie na backendu; frontend drzi jen event signal.
  notifyAuthChanged();
}

export function getToken(): string | null {
  // Backward-compatible API: bearer token uz se na klientovi nepouziva.
  return null;
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TENANT_KEY);
    notifyAuthChanged();
    notifyTenantChanged();
  }
}

export function setTenantContext(tenantId: number) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TENANT_KEY, String(tenantId));
    notifyTenantChanged();
  }
}

export function setTenantContextAll() {
  if (typeof window !== "undefined") {
    localStorage.setItem(TENANT_KEY, ALL_TENANTS_VALUE);
    notifyTenantChanged();
  }
}

export function isTenantContextAll(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(TENANT_KEY) === ALL_TENANTS_VALUE;
}

export function getTenantContext(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(TENANT_KEY);
  if (!raw) {
    return null;
  }

  if (raw === ALL_TENANTS_VALUE) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function clearTenantContext() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TENANT_KEY);
    notifyTenantChanged();
  }
}

export function isAuthenticated(): boolean {
  // Auth stav je server-side; klient ma user state z /api/me.
  return false;
}

export const authEvents = {
  changed: AUTH_CHANGED_EVENT,
  tenantChanged: TENANT_CHANGED_EVENT,
};
