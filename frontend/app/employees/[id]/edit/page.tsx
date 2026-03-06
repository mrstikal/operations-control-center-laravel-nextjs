"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEmployeeById, updateEmployee } from "@/lib/api/employees";
import { getMe } from "@/lib/api";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { getEmployeeDepartmentName } from "@/lib/hr-normalizers";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import { canFilterByTenantContext } from "@/lib/tenantAccess";
import type { Employee, Me } from "@/lib/types";
import { formatDateForInput } from "@/lib/formatters/date";
import AddListItemModal from "@/components/hr/AddListItemModal";
import SearchableSelect from "@/components/common/SearchableSelect";

export default function EmployeeEditPage() {
  const params = useParams();
  const router = useRouter();
  const { errorAction, successAction } = useToast();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalType, setItemModalType] = useState<"skill" | "certification">("skill");
  const [itemInput, setItemInput] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [canFilterByTenant, setCanFilterByTenant] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [hasSuperadminRole, setHasSuperadminRole] = useState(false);
  const { isReadOnly } = useTenantReadOnly(me);

  const [formData, setFormData] = useState({
    department: "",
    position: "",
    hire_date: "",
    available_hours_per_week: 40,
    utilization_percent: 0,
    skills: [] as string[],
    certifications: [] as string[],
    availability_status: "available" as "available" | "on_leave" | "on_maintenance" | "unavailable",
    availability_until: "",
    tenant_id: undefined as number | undefined,
  });

  const fetchEmployee = useCallback(async () => {
    if (!params.id) {
      return;
    }

    try {
      setLoading(true);
      const response = await getEmployeeById(Number(params.id));

      if (response && response.data) {
        const emp = response.data;
        setEmployee(emp);

        setFormData({
          department: getEmployeeDepartmentName(emp),
          position: emp.position || "",
          hire_date: formatDateForInput(emp.hire_date) || "",
          available_hours_per_week: emp.available_hours_per_week || 40,
          utilization_percent: emp.utilization_percent || 0,
          skills: Array.isArray(emp.skills) ? emp.skills : [],
          certifications: Array.isArray(emp.certifications) ? emp.certifications : [],
          availability_status: emp.availability_status || "available",
          availability_until: formatDateForInput(emp.availability_until) || "",
          tenant_id: emp.tenant_id ?? undefined,
        });
      }
    } catch (error) {
      console.error("Failed to fetch employee:", error);
      errorAction("Failed to load employee data");
    } finally {
      setLoading(false);
    }
  }, [params.id, errorAction]);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await getMe();
        setMe(res.data);
        const isSuperadmin = (res.data.roles ?? []).some((r) => r.name === "Superadmin");
        const canTenantFilter = canFilterByTenantContext(res.data);
        setHasSuperadminRole(isSuperadmin);
        setCanFilterByTenant(canTenantFilter);
        if (canTenantFilter) {
          const tenantsRes = await listTenants({ include_archived: isSuperadmin });
          setTenants(Array.isArray(tenantsRes.data) ? tenantsRes.data : []);
        }
      } catch {
        setMe(null);
      }
    }

    void fetchMe();
    void fetchEmployee();
  }, [fetchEmployee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      errorAction("Tenant is archived, this page is read-only.");
      return;
    }

    if (!params.id) {
      return;
    }

    try {
      setSubmitting(true);

      await updateEmployee(Number(params.id), {
        department: formData.department,
        position: formData.position,
        hire_date: formData.hire_date || undefined,
        available_hours_per_week: formData.available_hours_per_week,
        utilization_percent: formData.utilization_percent,
        skills: formData.skills,
        certifications: formData.certifications,
        availability_status: formData.availability_status,
        availability_until: formData.availability_until || undefined,
        ...(hasSuperadminRole && formData.tenant_id ? { tenant_id: formData.tenant_id } : {}),
      });

      successAction("Employee updated successfully");
      router.push(`/employees/${params.id}`);
    } catch (error) {
      console.error("Failed to update employee:", error);
      errorAction("Failed to update employee");
    } finally {
      setSubmitting(false);
    }
  };

  const openItemModal = (type: "skill" | "certification") => {
    setItemModalType(type);
    setItemInput("");
    setItemModalOpen(true);
  };

  const handleItemAddConfirm = () => {
    const value = itemInput.trim();
    if (!value) {
      return;
    }

    if (itemModalType === "skill") {
      setFormData((prev) => ({
        ...prev,
        skills: prev.skills.includes(value) ? prev.skills : [...prev.skills, value],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        certifications: prev.certifications.includes(value)
          ? prev.certifications
          : [...prev.certifications, value],
      }));
    }

    setItemModalOpen(false);
    setItemInput("");
  };

  const handleSkillRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const handleCertificationRemove = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4">Loading employee...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-sm border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-500">Employee not found</p>
          <button
            onClick={() => router.push("/employees")}
            className="mt-4 rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
          >
            Back to Employees
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Edit Employee</h1>
          <p className="text-slate-600">
            {employee.user?.name || "Employee"} (ID: {employee.id})
          </p>
        </div>
        <button
          onClick={() => router.push(`/employees/${params.id}`)}
          disabled={isReadOnly}
          className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-sm border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Employee Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                disabled={isReadOnly}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Position <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
              <input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            {canFilterByTenant && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tenant</label>
                <SearchableSelect
                  value={formData.tenant_id ?? ""}
                  options={tenants.map((t) => ({
                    id: t.id,
                    label: t.name,
                    value: t.id,
                    muted: Boolean(t.deleted_at),
                  }))}
                  onChange={(v) => setFormData((prev) => ({ ...prev, tenant_id: Number(v) }))}
                  placeholder="Vyberte tenant..."
                  disabled={isReadOnly || !hasSuperadminRole}
                  loading={tenants.length === 0}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Available Hours/Week
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={formData.available_hours_per_week}
                onChange={(e) =>
                  setFormData({ ...formData, available_hours_per_week: Number(e.target.value) })
                }
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Utilization (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.utilization_percent}
                onChange={(e) =>
                  setFormData({ ...formData, utilization_percent: Number(e.target.value) })
                }
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Availability Status
              </label>
              <select
                value={formData.availability_status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    availability_status: e.target.value as typeof formData.availability_status,
                  })
                }
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="available">Available</option>
                <option value="on_leave">On Leave</option>
                <option value="on_maintenance">On Maintenance</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Availability Until
              </label>
              <input
                type="date"
                value={formData.availability_until}
                onChange={(e) => setFormData({ ...formData, availability_until: e.target.value })}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="rounded-sm border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
            <button
              type="button"
              onClick={() => openItemModal("skill")}
              disabled={isReadOnly}
              className="rounded-sm bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
            >
              + Add Skill
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.skills.length === 0 ? (
              <p className="text-sm text-slate-500">No skills added yet</p>
            ) : (
              formData.skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleSkillRemove(index)}
                    disabled={isReadOnly}
                    className="text-red-600 hover:text-red-800 text-xl p-0"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Certifications */}
        <div className="rounded-sm border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Certifications</h2>
            <button
              type="button"
              onClick={() => openItemModal("certification")}
              disabled={isReadOnly}
              className="rounded-sm bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600"
            >
              + Add Certification
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.certifications.length === 0 ? (
              <p className="text-sm text-slate-500">No certifications added yet</p>
            ) : (
              formData.certifications.map((cert, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700"
                >
                  {cert}
                  <button
                    type="button"
                    onClick={() => handleCertificationRemove(index)}
                    disabled={isReadOnly}
                    className="text-red-600 hover:text-red-800 text-xl p-0"
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/employees/${params.id}`)}
            disabled={submitting || isReadOnly}
            className="rounded-sm border border-slate-300 bg-white px-6 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || isReadOnly}
            className="rounded-sm bg-slate-700 px-6 py-2 text-white hover:bg-slate-600 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      <AddListItemModal
        isOpen={itemModalOpen && !isReadOnly}
        type={itemModalType}
        value={itemInput}
        onChangeAction={setItemInput}
        onConfirmAction={handleItemAddConfirm}
        onCloseAction={() => setItemModalOpen(false)}
      />
    </div>
  );
}
