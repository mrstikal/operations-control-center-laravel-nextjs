"use client";

import SearchableSelect from "@/components/common/SearchableSelect";
import type { Tenant } from "@/lib/api/tenants";

type TenantSwitcherProps = {
  allTenantsValue: "all";
  canSwitchTenant: boolean;
  onTenantChangeAction: (value: string | number) => void;
  selectedTenantId: number | "all";
  tenantLoading: boolean;
  tenantOptions: Tenant[];
};

export default function TenantSwitcher({
  allTenantsValue,
  canSwitchTenant,
  onTenantChangeAction,
  selectedTenantId,
  tenantLoading,
  tenantOptions,
}: TenantSwitcherProps) {
  if (!canSwitchTenant) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <div className="text-slate-300 text-sm leading-none mt-1">Default Tenant: </div>
        <SearchableSelect
          value={selectedTenantId}
          loading={tenantLoading}
          disabled={tenantLoading}
          options={[
            { id: allTenantsValue, label: "All", value: allTenantsValue },
            ...tenantOptions.map((tenant) => ({
              id: tenant.id,
              label: tenant.name,
              value: tenant.id,
              muted: Boolean(tenant.deleted_at),
            })),
          ]}
          onChange={onTenantChangeAction}
        />
      </div>
    </div>
  );
}
