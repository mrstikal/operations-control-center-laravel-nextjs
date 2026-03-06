"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createEmployee } from "@/lib/api/employees";
import { getMe } from "@/lib/api";
import { listTenants, type Tenant } from "@/lib/api/tenants";
import { getTenantContext } from "@/lib/auth";
import { useHRMetadata } from "@/lib/hooks/useHRMetadata";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import { canFilterByTenantContext } from "@/lib/tenantAccess";
import AddListItemModal from "@/components/hr/AddListItemModal";
import SearchableSelect from "@/components/common/SearchableSelect";
import type { Me } from "@/lib/types";

export default function EmployeeCreatePage() {
  const router = useRouter();
  const { errorAction, successAction } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemModalType, setItemModalType] = useState<"skill" | "certification">("skill");
  const [itemInput, setItemInput] = useState("");
  const { metadata, loading: metadataLoading } = useHRMetadata();
  const [me, setMe] = useState<Me | null>(null);
  const [canFilterByTenant, setCanFilterByTenant] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [hasSuperadminRole, setHasSuperadminRole] = useState(false);
  const { isReadOnly } = useTenantReadOnly(me);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    department: "",
    position: "",
    hire_date: new Date().toISOString().split("T")[0],
    available_hours_per_week: 40,
    skills: [] as string[],
    certifications: [] as string[],
    tenant_id: undefined as number | undefined,
  });

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
          // Pre-fill tenant from header context
          const tenantContext = getTenantContext();
          if (tenantContext) {
            setFormData((prev) => ({ ...prev, tenant_id: tenantContext }));
          }
        }
      } catch {
        setMe(null);
      }
    }

    void fetchMe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      errorAction("Tenant is archived, this page is read-only.");
      return;
    }

    if (!formData.name || !formData.email || !formData.department || !formData.position) {
      errorAction("Please fill in all required fields");
      return;
    }

    try {
      setSubmitting(true);

      await createEmployee({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        bio: formData.bio || undefined,
        department: formData.department,
        position: formData.position,
        hire_date: formData.hire_date || undefined,
        available_hours_per_week: formData.available_hours_per_week,
        skills: formData.skills,
        certifications: formData.certifications,
        ...(canFilterByTenant && formData.tenant_id ? { tenant_id: formData.tenant_id } : {}),
      });

      successAction("Employee created successfully");
      router.push("/employees");
    } catch (error) {
      console.error("Failed to create employee:", error);
      errorAction("Failed to create employee");
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

  if (metadataLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Employee</h1>
          <p className="text-slate-600">Add a new employee profile</p>
        </div>
        <button
          onClick={() => router.push("/employees")}
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
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isReadOnly}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g. John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isReadOnly}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                placeholder="john.smith@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                placeholder="+420 123 456 789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select department</option>
                {metadata?.departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
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
                placeholder="e.g. Senior Technician"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tenant {hasSuperadminRole && <span className="text-red-500">*</span>}
                </label>
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
                  disabled={isReadOnly}
                  loading={tenants.length === 0}
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="Brief description about the employee..."
              />
            </div>

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
            onClick={() => router.push("/employees")}
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
            {submitting ? "Creating..." : "Create Employee"}
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
