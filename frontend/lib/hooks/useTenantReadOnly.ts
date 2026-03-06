import { useMemo } from "react";
import type { Me } from "@/lib/types";

export function useTenantReadOnly(me: Me | null) {
  return useMemo(() => {
    const isReadOnly = Boolean(me?.tenant_archived || me?.tenant?.deleted_at);
    const tenantName = me?.tenant?.name || `#${me?.tenant_id ?? ""}`;

    return {
      isReadOnly,
      tenantName,
      message: `Tenant ${tenantName} je archivovan, tato stranka je jen pro cteni.`,
    };
  }, [me]);
}
