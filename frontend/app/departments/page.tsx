"use client";

import ModalShell from "@/components/common/ModalShell";
import { useDepartmentManagement } from "@/hooks/departments/useDepartmentManagement";

export default function DepartmentsPage() {
  const {
    departments,
    loading,
    isSuperadmin,
    saving,
    modalOpen,
    editing,
    name,
    description,
    isActive,
    reassignModalOpen,
    departmentToDelete,
    availableDepartments,
    targetDepartmentId,
    assignedCount,
    setName,
    setDescription,
    setIsActive,
    setTargetDepartmentId,
    openCreateAction,
    openEditAction,
    closeModalAction,
    saveDepartmentAction,
    deleteDepartmentAction,
    closeReassignModalAction,
    reassignAndDeleteAction,
  } = useDepartmentManagement();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="content-card">Loading departments...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Departments</h1>
          <p className="text-slate-600">Manage HR departments and visibility.</p>
        </div>
        {isSuperadmin && (
          <button
            type="button"
            onClick={openCreateAction}
            className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
          >
            + New Department
          </button>
        )}
      </div>

      {!isSuperadmin && (
        <div className="rounded-sm border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          You can view departments. Create, edit and delete are restricted to Superadmin.
        </div>
      )}

      <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Assigned Employees</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No departments found.
                </td>
              </tr>
            ) : (
              departments.map((department) => (
                <tr key={department.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">{department.name}</td>
                  <td className="px-4 py-3 text-slate-600">{department.description || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {department.assigned_employees_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                        department.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {department.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {isSuperadmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditAction(department)}
                            className="rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void deleteDepartmentAction(department);
                            }}
                            className="rounded-sm bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">View only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModalShell
        isOpen={modalOpen}
        onCloseAction={closeModalAction}
        title={editing ? "Edit Department" : "Create Department"}
        loading={saving}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              placeholder="Department name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModalAction}
              className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void saveDepartmentAction();
              }}
              disabled={saving}
              className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        isOpen={reassignModalOpen}
        onCloseAction={closeReassignModalAction}
        title="Reassign Employees Before Deletion"
        loading={saving}
      >
        <div className="space-y-4">
          <div className="rounded-sm border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <strong>Warning:</strong> Department &quot;{departmentToDelete?.name}&quot; has {assignedCount}
            {" "}
            assigned employee(s). Select a target department to reassign them before deletion.
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Target Department</label>
            <select
              value={targetDepartmentId || ""}
              onChange={(event) =>
                setTargetDepartmentId(event.target.value ? Number(event.target.value) : null)
              }
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select department...</option>
              {availableDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeReassignModalAction}
              className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void reassignAndDeleteAction();
              }}
              disabled={saving || !targetDepartmentId}
              className="rounded-sm bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? "Processing..." : "Reassign & Delete"}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
