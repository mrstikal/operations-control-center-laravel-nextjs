"use client";

import { useMemo } from "react";
import DataTable, {
  type DataTableAction,
  type DataTableColumn,
} from "@/components/common/DataTable";
import FilterBar, { type FilterField } from "@/components/common/FilterBar";
import PaginationComponent from "@/components/common/Pagination";
import EmployeeStatusBadge from "@/components/employees/EmployeeStatusBadge";
import { useEmployeeManagement } from "@/hooks/employees/useEmployeeManagement";
import { UI_MESSAGES } from "@/lib/ui-messages";
import type { Employee } from "@/lib/types";
import type { Tenant } from "@/lib/api/tenants";
import {
  getEmployeeDepartmentName,
  getEmployeeDisplayEmail,
  getEmployeeDisplayName,
  getEmployeeDisplayPhone,
} from "@/lib/hr-normalizers";

export default function EmployeesPage() {
  const {
    employees,
    loading,
    sort,
    page,
    perPage,
    pagination,
    metadata,
    canManageEmployees,
    canHardDeleteEmployees,
    isPageReadOnly,
    canFilterByTenant,
    tenants,
    filterInitialValues,
    archivedTenantNameForBanner,
    setPage,
    setPerPage,
    handleFilterChange,
    handleSortChange,
    goToCreateEmployeeAction,
    viewEmployeeAction,
    editEmployeeAction,
    softDeleteEmployeeAction,
    restoreEmployeeAction,
    hardDeleteEmployeeAction,
  } = useEmployeeManagement();

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: "search",
        label: "Search",
        type: "text",
        placeholder: "Name or email...",
      },
      {
        key: "department",
        label: "Department",
        type: "select",
        options: metadata?.departments.map((department: string) => ({
          label: department,
          value: department,
        })) ?? [],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          ...(metadata?.availability_statuses ?? []),
          { label: "Deleted", value: "deleted" },
        ],
      },
      ...(canFilterByTenant ? [{
        key: "tenant_id",
        label: "Tenant",
        type: "select" as const,
        options: tenants.map((t: Tenant) => ({
          label: t.name,
          value: String(t.id),
          muted: Boolean(t.deleted_at),
        })),
      }] : []),
    ],
    [metadata?.availability_statuses, metadata?.departments, canFilterByTenant, tenants]
  );

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        key: "id",
        label: "ID",
        sortable: true,
        className: "w-20",
        render: (employee) => <span className="font-mono text-slate-600">#{employee.id}</span>,
      },
      {
        key: "name",
        label: "Name",
        sortable: true,
        render: (employee) => (
          <div>
            <div className="font-medium text-slate-900">{getEmployeeDisplayName(employee)}</div>
            <div className="text-xs text-slate-500">{getEmployeeDisplayEmail(employee)}</div>
          </div>
        ),
      },
      {
        key: "department",
        label: "Department",
        render: (employee) => getEmployeeDepartmentName(employee),
      },
      ...(canFilterByTenant ? [{
        key: "tenant" as const,
        label: "Tenant",
        render: (employee: Employee) => employee.tenant?.name ?? "—",
      }] : []),
      {
        key: "position",
        label: "Position",
        render: (employee) => employee.position || "-",
      },
      {
        key: "phone",
        label: "Phone",
        render: (employee) => getEmployeeDisplayPhone(employee),
      },
      {
        key: "availability_status",
        label: "Status",
        render: (employee) => <EmployeeStatusBadge employee={employee} />,
      },
    ],
    [canFilterByTenant]
  );

  const actions = useMemo<DataTableAction<Employee>[]>(
    () => [
      {
        label: "View",
        onClick: viewEmployeeAction,
      },
      {
        label: "Edit",
        onClick: editEmployeeAction,
        isVisible: (employee) => canManageEmployees && !employee.deleted_at,
        isDisabled: () => isPageReadOnly,
        disabledReason: UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY,
      },
      {
        label: "Delete",
        variant: "danger",
        onClick: (employee) => {
          void softDeleteEmployeeAction(employee);
        },
        isVisible: (employee) => canManageEmployees && !employee.deleted_at,
        isDisabled: () => isPageReadOnly,
        disabledReason: UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY,
      },
      {
        label: "Restore",
        onClick: (employee) => {
          void restoreEmployeeAction(employee);
        },
        isVisible: (employee) => canHardDeleteEmployees && Boolean(employee.deleted_at),
        isDisabled: () => isPageReadOnly,
        disabledReason: UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY,
      },
      {
        label: "Hard Delete",
        variant: "danger",
        onClick: (employee) => {
          void hardDeleteEmployeeAction(employee);
        },
        isVisible: (employee) => canHardDeleteEmployees && Boolean(employee.deleted_at),
        isDisabled: () => isPageReadOnly,
        disabledReason: UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY,
      },
    ],
    [
      canHardDeleteEmployees,
      canManageEmployees,
      editEmployeeAction,
      hardDeleteEmployeeAction,
      isPageReadOnly,
      restoreEmployeeAction,
      softDeleteEmployeeAction,
      viewEmployeeAction,
    ]
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-600">Manage employee profiles and assignments</p>
        </div>
        {canManageEmployees && (
          <button
            type="button"
            onClick={goToCreateEmployeeAction}
            disabled={isPageReadOnly}
            title={isPageReadOnly ? UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY : undefined}
            className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Employee
          </button>
        )}
      </div>

      {archivedTenantNameForBanner && (
        <div className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Tenant <strong>{archivedTenantNameForBanner}</strong> je archivován. Stránka je pouze pro čtení.
        </div>
      )}

      <FilterBar
        fields={filterFields}
        onChangeAction={handleFilterChange}
        initialValues={filterInitialValues}
      />

      <DataTable
        data={employees}
        columns={columns}
        actions={actions}
        loading={loading}
        emptyText="No employees found"
        rowKey={(row) => row.id}
        sort={sort}
        onSortChange={handleSortChange}
      />

      <PaginationComponent
        pagination={pagination}
        page={page}
        perPage={perPage}
        loading={loading}
        onPageChangeAction={setPage}
        onPerPageChangeAction={setPerPage}
      />
    </div>
  );
}
