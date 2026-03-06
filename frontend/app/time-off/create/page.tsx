"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { listEmployees } from "@/lib/api/employees";
import { createTimeOffRequest } from "@/lib/api/timeOff";
import { useHRMetadata } from "@/lib/hooks/useHRMetadata";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import type { Employee, Me } from "@/lib/types";
import SearchableSelect, {
  type SearchableSelectOption,
} from "@/components/common/SearchableSelect";

export default function CreateTimeOffPage() {
  const router = useRouter();
  const { metadata, loading: metadataLoading } = useHRMetadata();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSelectEmployee, setCanSelectEmployee] = useState(false);
  const [selfEmployeeLabel, setSelfEmployeeLabel] = useState("Myself");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const { isReadOnly } = useTenantReadOnly(me);

  const [formData, setFormData] = useState({
    employee_id: "",
    start_date: "",
    end_date: "",
    type: "vacation",
    reason: "",
  });

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function loadCreateContext() {
      try {
        const me = await getMe();
        setMe(me.data);
        const meLabel = (me.data.name || "Myself") + (me.data.email ? ` (${me.data.email})` : "");
        setSelfEmployeeLabel(meLabel);

        const highestRoleLevel = Math.max(...(me.data.roles ?? []).map((r) => r.level), 0);

        if (highestRoleLevel >= 3) {
          setCanSelectEmployee(true);
          setEmployeeLoading(true);
          const employeeList = await listEmployees({
            per_page: 200,
            sort_by: "name",
            sort_order: "asc",
          });
          const loadedEmployees = Array.isArray(employeeList.data) ? employeeList.data : [];
          setEmployees(loadedEmployees);

          // Preselect current user when present, otherwise first employee.
          const selfEmployee = loadedEmployees.find((emp) => emp.user_id === me.data.id);
          const defaultEmployee = selfEmployee ?? loadedEmployees[0];
          if (defaultEmployee) {
            setFormData((prev) => ({ ...prev, employee_id: String(defaultEmployee.id) }));
          }
        }
      } catch (err) {
        console.error("Failed to load time-off create context:", err);
      } finally {
        setEmployeeLoading(false);
      }
    }

    void loadCreateContext();
  }, []);

  const employeeOptions: SearchableSelectOption[] = employees.map((emp) => ({
    id: emp.id,
    value: String(emp.id),
    label:
      (emp.user?.name || emp.name || `Employee #${emp.id}`) +
      (emp.user?.email ? ` (${emp.user.email})` : ""),
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }
    setError(null);

    if (!formData.start_date || !formData.end_date || !formData.type) {
      setError("Please fill in all required fields.");
      return;
    }

    if (canSelectEmployee && !formData.employee_id) {
      setError("Please select an employee.");
      return;
    }

    if (formData.end_date < formData.start_date) {
      setError("End date must be on or after start date.");
      return;
    }

    try {
      setSubmitting(true);

      await createTimeOffRequest({
        employee_id: formData.employee_id ? Number(formData.employee_id) : undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        type: formData.type,
        reason: formData.reason || undefined,
      });

      router.push("/time-off");
    } catch (err) {
      console.error("Failed to create time-off request:", err);
      setError(err instanceof Error ? err.message : "Failed to create request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">New Time-Off Request</h1>
          <p className="text-slate-600">Create a new request for your planned absence.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/time-off")}
          className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-sm border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {canSelectEmployee ? (
            <div className="md:col-span-2">
              <SearchableSelect
                label="Employee"
                required
                options={employeeOptions}
                value={formData.employee_id}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, employee_id: String(value) }))
                }
                placeholder="Search employee..."
                disabled={submitting || isReadOnly}
                loading={employeeLoading}
              />
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Employee</label>
              <input
                type="text"
                value={selfEmployeeLabel}
                readOnly
                className="w-full rounded-sm border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Start Date *</label>
            <input
              type="date"
              min={today}
              value={formData.start_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              disabled={isReadOnly}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">End Date *</label>
            <input
              type="date"
              min={formData.start_date || today}
              value={formData.end_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              disabled={isReadOnly}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              disabled={metadataLoading || isReadOnly}
              required
            >
              {(metadata?.time_off_types?.length
                ? metadata.time_off_types
                : [
                    { label: "Vacation", value: "vacation" },
                    { label: "Sick Leave", value: "sick_leave" },
                    { label: "Personal", value: "personal" },
                    { label: "Other", value: "other" },
                  ]
              ).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              rows={4}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              placeholder="Optional reason for your request..."
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/time-off")}
            className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            disabled={submitting || isReadOnly}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:opacity-50"
            disabled={submitting || isReadOnly}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
