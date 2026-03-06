"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SearchableSelect from "@/components/common/SearchableSelect";
import { getMe } from "@/lib/api";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import { listEmployees } from "@/lib/api/employees";
import {
  assignEmployeesToShift,
  deleteShift,
  getShift,
  removeEmployeeShiftAssignment,
  type EmployeeShiftAssignment,
  type Shift,
} from "@/lib/api/shifts";
import type { Employee, Me } from "@/lib/types";
import { DAYS_OF_WEEK } from "@/lib/hr-constants";

function getDaysLabel(days: number[]) {
  if (days.length === 7) return "Every day";
  if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return "Weekdays";
  if (days.length === 2 && days.includes(6) && days.includes(7)) return "Weekends";

  return days
    .map((d) => DAYS_OF_WEEK.find((dow) => dow.value === d)?.label.substring(0, 3))
    .join(", ");
}

export default function ShiftDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { confirmAction } = useConfirm();
  const { errorAction, successAction } = useToast();
  const shiftId = Number(params.id);

  const [shift, setShift] = useState<Shift | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManageShifts, setCanManageShifts] = useState(false);
  const [pendingEmployeeIds, setPendingEmployeeIds] = useState<number[]>([]);
  const [assignmentStartDate, setAssignmentStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [assignmentEndDate, setAssignmentEndDate] = useState("");
  const { isReadOnly } = useTenantReadOnly(me);

  const loadPermissions = useCallback(async () => {
    try {
      const me = await getMe();
      setMe(me.data);
      const highestRoleLevel = Math.max(...(me.data.roles ?? []).map((role) => role.level), 0);
      setCanManageShifts(highestRoleLevel >= 3);
    } catch (error) {
      console.error("Failed to load shift permissions:", error);
    }
  }, []);

  const fetchShift = useCallback(async () => {
    if (Number.isNaN(shiftId)) {
      setError("Invalid shift id");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getShift(shiftId);
      setShift(response.data);
    } catch (error) {
      console.error("Failed to fetch shift:", error);
      setError(error instanceof Error ? error.message : "Failed to load shift");
    } finally {
      setLoading(false);
    }
  }, [shiftId]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await listEmployees({ per_page: 100 });
      setEmployees(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
  }, []);

  useEffect(() => {
    void loadPermissions();
    void fetchShift();
    void fetchEmployees();
  }, [fetchEmployees, fetchShift, loadPermissions]);

  const assignedEmployeeIds = useMemo(
    () => (shift?.employees ?? []).map((assignment) => assignment.employee_id),
    [shift?.employees]
  );

  const availableEmployeeOptions = useMemo(() => {
    return employees
      .filter(
        (employee) =>
          !assignedEmployeeIds.includes(employee.id) && !pendingEmployeeIds.includes(employee.id)
      )
      .map((employee) => ({
        id: employee.id,
        value: employee.id,
        label: employee.user?.name || `Employee #${employee.id}`,
      }));
  }, [assignedEmployeeIds, employees, pendingEmployeeIds]);

  const pendingEmployees = useMemo(() => {
    return pendingEmployeeIds
      .map((id) => employees.find((employee) => employee.id === id))
      .filter((employee): employee is Employee => Boolean(employee));
  }, [employees, pendingEmployeeIds]);

  const employeeIdsToAssign = useMemo(() => pendingEmployeeIds, [pendingEmployeeIds]);

  function handleSelectEmployee(value: string | number) {
    const employeeId = Number(value);

    if (Number.isNaN(employeeId) || pendingEmployeeIds.includes(employeeId)) {
      return;
    }

    setPendingEmployeeIds((prev) => [...prev, employeeId]);
  }

  function removePendingEmployee(employeeId: number) {
    setPendingEmployeeIds((prev) => prev.filter((id) => id !== employeeId));
  }

  async function handleAssignEmployees() {
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }

    if (!shift || employeeIdsToAssign.length === 0) {
      return;
    }

    try {
      setSaving(true);
      await assignEmployeesToShift(
        shift.id,
        employeeIdsToAssign,
        assignmentStartDate,
        assignmentEndDate || undefined
      );
      setPendingEmployeeIds([]);
      setAssignmentEndDate("");
      await fetchShift();
    } catch (error) {
      console.error("Failed to assign employees:", error);
      errorAction("Failed to assign employees");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveAssignment(assignment: EmployeeShiftAssignment) {
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }

    const confirmed = await confirmAction({
      title: "Remove assignment",
      message: `Remove ${assignment.employee.user.name} from this shift?`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      await removeEmployeeShiftAssignment(assignment.id);
      await fetchShift();
      successAction("Employee removed from shift");
    } catch (error) {
      console.error("Failed to remove assignment:", error);
      errorAction("Failed to remove employee from shift");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteShift() {
    if (isReadOnly) {
      setError("Tenant is archived, this page is read-only.");
      return;
    }

    if (!shift) {
      return;
    }

    const confirmed = await confirmAction({
      title: "Delete shift",
      message: `Delete shift "${shift.name}"?`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);
      await deleteShift(shift.id);
      successAction("Shift deleted successfully");
      router.push("/shifts");
    } catch (error) {
      console.error("Failed to delete shift:", error);
      errorAction("Failed to delete shift");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4">Loading shift...</div>
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <button
          onClick={() => router.push("/shifts")}
          className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          ← Back to Shifts
        </button>
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          {error || "Shift not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/shifts")}
            className="mb-3 rounded-sm border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            ← Back to Shifts
          </button>
          <h1 className="text-3xl font-bold text-slate-900">{shift.name}</h1>
          <p className="text-slate-600">Shift details and employee assignments</p>
        </div>
        {canManageShifts && (
          <button
            type="button"
            onClick={handleDeleteShift}
            disabled={saving || isReadOnly}
            className="rounded-sm bg-red-600 px-4 py-2 text-white hover:bg-red-500 disabled:opacity-50"
          >
            Delete Shift
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Overview</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-slate-500">Time</label>
                <p className="font-medium text-slate-900">
                  {shift.start_time} - {shift.end_time}
                </p>
              </div>
              <div>
                <label className="text-sm text-slate-500">Status</label>
                <p className="font-medium text-slate-900">
                  {shift.is_active ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-500">Days</label>
                <p className="font-medium text-slate-900">{getDaysLabel(shift.days_of_week)}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-slate-500">Description</label>
                <p className="font-medium text-slate-900">{shift.description || "-"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Assigned Employees</h2>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {(shift.employees ?? []).length} assigned
              </span>
            </div>

            {(shift.employees ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">
                No employees are currently assigned to this shift.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {(shift.employees ?? []).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-start justify-between gap-4 rounded-sm border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{assignment.employee.user.name}</p>
                      <p className="text-sm text-slate-600">{assignment.employee.user.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Active from {assignment.start_date}
                        {assignment.end_date ? ` to ${assignment.end_date}` : " (ongoing)"}
                      </p>
                    </div>
                    {canManageShifts && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignment(assignment)}
                        disabled={saving || isReadOnly}
                        className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Stats</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-sm bg-slate-50 p-3">
                <p className="text-slate-500">Assignments</p>
                <p className="font-semibold text-slate-900">{(shift.employees ?? []).length}</p>
              </div>
              <div className="rounded-sm bg-slate-50 p-3">
                <p className="text-slate-500">Days</p>
                <p className="font-semibold text-slate-900">{shift.days_of_week.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Assign Employees</h2>

            {!canManageShifts ? (
              <p className="text-sm text-slate-500">Only Manager+ can manage assignments.</p>
            ) : (
              <div className="space-y-4">
                <SearchableSelect
                  label="Employee"
                  placeholder="Search employee..."
                  options={availableEmployeeOptions}
                  value=""
                  onChange={handleSelectEmployee}
                  disabled={isReadOnly}
                />

                <p className="text-xs text-slate-500">
                  Select employees to add them to the pending assignment list below.
                </p>

                {pendingEmployees.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Pending employees</p>
                    <div className="flex flex-wrap gap-2">
                      {pendingEmployees.map((employee) => (
                        <span
                          key={employee.id}
                          className="inline-flex items-center gap-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700"
                        >
                          {employee.user?.name || `Employee #${employee.id}`}
                          <button
                            type="button"
                            onClick={() => removePendingEmployee(employee.id)}
                            disabled={isReadOnly}
                            className="text-slate-500 hover:text-slate-900"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={assignmentStartDate}
                    onChange={(e) => setAssignmentStartDate(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">End Date</label>
                  <input
                    type="date"
                    value={assignmentEndDate}
                    onChange={(e) => setAssignmentEndDate(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAssignEmployees}
                  disabled={
                    saving || employeeIdsToAssign.length === 0 || !assignmentStartDate || isReadOnly
                  }
                  className="w-full rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : `Assign Employee${employeeIdsToAssign.length > 1 ? "s" : ""}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
