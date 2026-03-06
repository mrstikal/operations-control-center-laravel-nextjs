import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import type { Me } from "@/lib/types";

const baseMe: Me = {
  id: 1,
  tenant_id: 10,
  name: "Alice",
  email: "alice@example.com",
  tenant: { id: 10, name: "Acme Corp" },
};

describe("useTenantReadOnly", () => {
  it("returns isReadOnly=false for a live tenant", () => {
    const { result } = renderHook(() => useTenantReadOnly(baseMe));
    expect(result.current.isReadOnly).toBe(false);
  });

  it("returns isReadOnly=true when tenant_archived is true", () => {
    const { result } = renderHook(() => useTenantReadOnly({ ...baseMe, tenant_archived: true }));
    expect(result.current.isReadOnly).toBe(true);
  });

  it("returns isReadOnly=true when tenant.deleted_at is set", () => {
    const me: Me = {
      ...baseMe,
      tenant: { id: 10, name: "Acme Corp", deleted_at: "2024-01-01T00:00:00Z" },
    };
    const { result } = renderHook(() => useTenantReadOnly(me));
    expect(result.current.isReadOnly).toBe(true);
  });

  it("uses tenant.name in tenantName", () => {
    const { result } = renderHook(() => useTenantReadOnly(baseMe));
    expect(result.current.tenantName).toBe("Acme Corp");
  });

  it("falls back to #tenant_id when tenant.name is absent", () => {
    const me: Me = { ...baseMe, tenant: undefined };
    const { result } = renderHook(() => useTenantReadOnly(me));
    expect(result.current.tenantName).toBe("#10");
  });

  it("returns isReadOnly=false when me is null", () => {
    const { result } = renderHook(() => useTenantReadOnly(null));
    expect(result.current.isReadOnly).toBe(false);
  });
});
