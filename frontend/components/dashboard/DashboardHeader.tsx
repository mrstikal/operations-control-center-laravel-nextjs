"use client";

import SearchableSelect, {
  type SearchableSelectOption,
} from "@/components/common/SearchableSelect";
import type { ArchiveStatus, TenantFilterValue } from "@/lib/dashboard/types";

type DashboardHeaderProps = {
  archiveStatus: ArchiveStatus;
  isSuperadminUser: boolean;
  onArchiveStatusChangeAction: (status: ArchiveStatus) => void;
  onTenantFilterChangeAction: (value: string | number) => void;
  tenantFilter: TenantFilterValue;
  tenantOptions: SearchableSelectOption[];
  tenantsLoading: boolean;
};

const ARCHIVE_OPTIONS: Array<{ label: string; value: ArchiveStatus }> = [
  { label: "Without archived", value: "active" },
  { label: "Archived only", value: "archived" },
  { label: "All", value: "all" },
];

export default function DashboardHeader({
  archiveStatus,
  isSuperadminUser,
  onArchiveStatusChangeAction,
  onTenantFilterChangeAction,
  tenantFilter,
  tenantOptions,
  tenantsLoading,
}: DashboardHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      {isSuperadminUser && (
        <div className="space-y-4">
          <div className="max-w-sm">
            <SearchableSelect
              label="Tenant scope"
              options={tenantOptions}
              value={tenantFilter}
              onChange={onTenantFilterChangeAction}
              loading={tenantsLoading}
              placeholder="Select tenant scope"
            />
          </div>

          {tenantFilter === "all" && (
            <div className="flex gap-2">
              {ARCHIVE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onArchiveStatusChangeAction(option.value)}
                  className={`px-4 py-2 rounded font-medium transition ${
                    archiveStatus === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
