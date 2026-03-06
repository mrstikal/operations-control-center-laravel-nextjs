import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authEvents,
  clearTenantContext,
  clearToken,
  getTenantContext,
  getToken,
  isTenantContextAll,
  isAuthenticated,
  setTenantContext,
  setTenantContextAll,
  setToken,
} from "@/lib/auth";

describe("auth storage flow", () => {
  afterEach(() => {
    clearTenantContext();
  });

  it("does not persist bearer token in browser storage", () => {
    setToken("token-123");

    expect(getToken()).toBeNull();
    expect(localStorage.getItem("occ_token")).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it("clearToken removes the token and tenant context", () => {
    setToken("token-123");
    setTenantContext(11);

    clearToken();

    expect(getToken()).toBeNull();
    expect(getTenantContext()).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });


  it("dispatches auth and tenant changed events", () => {
    const authSpy = vi.fn();
    const tenantSpy = vi.fn();

    window.addEventListener(authEvents.changed, authSpy);
    window.addEventListener(authEvents.tenantChanged, tenantSpy);

    setToken("token-456");
    setTenantContext(25);
    clearTenantContext();

    expect(authSpy.mock.calls).toHaveLength(1);
    expect(tenantSpy.mock.calls).toHaveLength(2);

    window.removeEventListener(authEvents.changed, authSpy);
    window.removeEventListener(authEvents.tenantChanged, tenantSpy);
  });

  it("ignores an invalid tenant context value", () => {
    localStorage.setItem("occ_default_tenant_id", "invalid");
    expect(getTenantContext()).toBeNull();
    expect(isTenantContextAll()).toBe(false);

    localStorage.setItem("occ_default_tenant_id", "-3");
    expect(getTenantContext()).toBeNull();
    expect(isTenantContextAll()).toBe(false);
  });

  it("persists explicit all-tenants context", () => {
    setTenantContextAll();

    expect(localStorage.getItem("occ_default_tenant_id")).toBe("all");
    expect(isTenantContextAll()).toBe(true);
    expect(getTenantContext()).toBeNull();
  });
});
