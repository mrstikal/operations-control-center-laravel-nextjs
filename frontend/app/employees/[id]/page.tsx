"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMe } from "@/lib/api";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import {
  deleteEmployee,
  getEmployeeById,
  hardDeleteEmployee,
  restoreEmployee,
} from "@/lib/api/employees";
import type { Employee, Me } from "@/lib/types";
import {
  getEmployeeDisplayEmail,
  getEmployeeDisplayName,
  getEmployeeDisplayPhone,
  getShiftEndDate,
  getShiftName,
  getShiftStartDate,
  getShiftTimeRange,
  getTimeOffEnd,
  getTimeOffStart,
  getTimeOffStatus,
  getTimeOffType,
  getWorkloadActual,
  getWorkloadAllocated,
  getWorkloadDate,
  getWorkloadUtilization,
  getEmployeeDepartmentName,
} from "@/lib/hr-normalizers";

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { confirmAction } = useConfirm();
  const { errorAction, successAction } = useToast();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"shifts" | "timeoff" | "workload" | "skills">(
    "shifts"
  );
  const [canManageEmployees, setCanManageEmployees] = useState(false);
  const [canHardDeleteEmployees, setCanHardDeleteEmployees] = useState(false);
  const { isReadOnly } = useTenantReadOnly(me);

  useEffect(() => {
    async function loadPermissions() {
      try {
        const me = await getMe();
        setMe(me.data);
        const highestRoleLevel = Math.max(...(me.data.roles ?? []).map((role) => role.level), 0);
        setCanManageEmployees(highestRoleLevel >= 3);
        setCanHardDeleteEmployees(highestRoleLevel >= 4);
      } catch (error) {
        console.error("Failed to load employee permissions:", error);
      }
    }

    void loadPermissions();
  }, []);

  const fetchEmployee = useCallback(async () => {
    if (!params.id || params.id === "create") {
      return;
    }

    const employeeId = Number(params.id);
    if (isNaN(employeeId)) {
      return;
    }

    try {
      setLoading(true);
      const response = await getEmployeeById(employeeId);

      if (response && response.data) {
        setEmployee(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch employee:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void fetchEmployee();
  }, [fetchEmployee]);

  const displayName = getEmployeeDisplayName(employee || ({ id: 0 } as Employee));
  const displayEmail = getEmployeeDisplayEmail(employee || ({ id: 0 } as Employee));
  const displayPhone = getEmployeeDisplayPhone(employee || ({ id: 0 } as Employee));

  const shifts = useMemo(() => {
    const raw = (employee as (Employee & { shifts?: unknown }) | null)?.shifts;
    return Array.isArray(raw) ? raw : [];
  }, [employee]);

  const timeOffHistory = useMemo(() => {
    const raw =
      (employee as (Employee & { time_off_requests?: unknown; timeOffRequests?: unknown }) | null)
        ?.time_off_requests ??
      (employee as (Employee & { timeOffRequests?: unknown }) | null)?.timeOffRequests;
    return Array.isArray(raw) ? raw : [];
  }, [employee]);

  const workloadHistory = useMemo(() => {
    const raw = (employee as (Employee & { workload?: unknown }) | null)?.workload;
    return Array.isArray(raw) ? raw : [];
  }, [employee]);

  const skills = Array.isArray((employee as (Employee & { skills?: unknown }) | null)?.skills)
    ? ((employee as (Employee & { skills?: string[] }) | null)?.skills ?? [])
    : [];

  const certifications = Array.isArray(
    (employee as (Employee & { certifications?: unknown }) | null)?.certifications
  )
    ? ((employee as (Employee & { certifications?: string[] }) | null)?.certifications ?? [])
    : [];

  const quickStats = useMemo(() => {
    const thisWeekHours =
      typeof employee?.this_week_hours === "number" ? employee.this_week_hours : 0;
    const pendingTimeOff =
      typeof employee?.pending_timeoff === "number"
        ? employee.pending_timeoff
        : timeOffHistory.filter((r) => getTimeOffStatus(r) === "pending").length;

    const utilizationValues = workloadHistory
      .map((entry) => Number(getWorkloadUtilization(entry)))
      .filter((value) => Number.isFinite(value));

    const avgUtilization =
      utilizationValues.length > 0
        ? Math.round(
            utilizationValues.reduce((sum, value) => sum + value, 0) / utilizationValues.length
          )
        : 0;

    return {
      thisWeekHours,
      pendingTimeOff,
      skillsCount: skills.length,
      certificationsCount: certifications.length,
      shiftsCount: shifts.length,
      avgUtilization,
    };
  }, [
    employee?.pending_timeoff,
    employee?.this_week_hours,
    timeOffHistory,
    workloadHistory,
    skills.length,
    certifications.length,
    shifts.length,
  ]);

  const utilizationToneClass = useMemo(() => {
    if (quickStats.avgUtilization >= 90) {
      return "text-red-700";
    }
    if (quickStats.avgUtilization >= 75) {
      return "text-amber-700";
    }
    return "text-emerald-700";
  }, [quickStats.avgUtilization]);

  const isDeleted = Boolean(employee?.deleted_at);

  const handleSoftDelete = async () => {
    if (isReadOnly) {
      errorAction("Tenant is archived, this page is read-only.");
      return;
    }

    if (!employee) {
      return;
    }

    const confirmed = await confirmAction({
      title: "Soft delete employee",
      message: `Soft delete employee #${employee.id}?`,
      confirmLabel: "Soft delete",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteEmployee(employee.id);
      successAction("Employee deleted successfully");
      router.push("/employees");
    } catch (error) {
      console.error("Failed to delete employee:", error);
      errorAction("Failed to delete employee");
    }
  };

  const handleRestore = async () => {
    if (isReadOnly) {
      errorAction("Tenant is archived, this page is read-only.");
      return;
    }

    if (!employee) {
      return;
    }

    const confirmed = await confirmAction({
      title: "Restore employee",
      message: `Restore employee #${employee.id}?`,
      confirmLabel: "Restore",
    });
    if (!confirmed) {
      return;
    }

    try {
      await restoreEmployee(employee.id);
      await fetchEmployee();
      successAction("Employee restored successfully");
    } catch (error) {
      console.error("Failed to restore employee:", error);
      errorAction("Failed to restore employee");
    }
  };

  const handleHardDelete = async () => {
    if (isReadOnly) {
      errorAction("Tenant is archived, this page is read-only.");
      return;
    }

    if (!employee) {
      return;
    }

    const confirmed = await confirmAction({
      title: "Permanently delete employee",
      message: `Permanently delete employee #${employee.id}? This cannot be undone.`,
      confirmLabel: "Permanently delete",
      tone: "danger",
    });
    if (!confirmed) {
      return;
    }

    try {
      await hardDeleteEmployee(employee.id);
      successAction("Employee permanently deleted");
      router.push("/employees");
    } catch (error) {
      console.error("Failed to permanently delete employee:", error);
      errorAction("Failed to permanently delete employee");
    }
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
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{displayName}</h1>
            <p className="text-slate-600">{employee.position || "Employee"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isDeleted
            ? canHardDeleteEmployees && (
                <div className="flex gap-2">
                  <button
                    onClick={handleRestore}
                    disabled={isReadOnly}
                    className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
                  >
                    Restore
                  </button>
                  <button
                    onClick={handleHardDelete}
                    disabled={isReadOnly}
                    className="rounded-sm bg-red-600 px-4 py-2 text-white hover:bg-red-500"
                  >
                    Hard Delete
                  </button>
                </div>
              )
            : canManageEmployees && (
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/employees/${employee.id}/edit`)}
                    disabled={isReadOnly}
                    className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleSoftDelete}
                    disabled={isReadOnly}
                    className="rounded-sm bg-red-600 px-4 py-2 text-white hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
              )}
        </div>
      </div>

      {/* Employee Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-sm border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Employee Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-500">Employee ID</label>
              <p className="font-mono font-medium">#{employee.id}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Department</label>
              <p className="font-medium">{getEmployeeDepartmentName(employee)}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Position</label>
              <p className="font-medium">{employee.position || "-"}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Email</label>
              <p className="font-medium">{displayEmail}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Phone</label>
              <p className="font-medium">{displayPhone}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500">Status</label>
              <p className="font-medium">{isDeleted ? "Deleted" : employee.status || "Active"}</p>
            </div>
            {(employee.tenant?.name ?? employee.tenant_id) && (
              <div>
                <label className="text-sm text-slate-500">Tenant</label>
                <p className="font-medium">
                  {employee.tenant?.name ?? `#${employee.tenant_id}`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-2">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-sm bg-slate-50 p-3">
                <p className="text-slate-500">This Week Hours</p>
                <p className="font-semibold text-slate-900">{quickStats.thisWeekHours}h</p>
              </div>
              <div className="rounded-sm bg-slate-50 p-3">
                <p className="text-slate-500">Pending Time-Off</p>
                <p className="font-semibold text-slate-900">{quickStats.pendingTimeOff}</p>
              </div>
              <div className="rounded-sm bg-slate-50 p-3">
                <p className="text-slate-500">Assigned Shifts</p>
                <p className="font-semibold text-slate-900">{quickStats.shiftsCount}</p>
              </div>
              <div className="rounded-sm bg-slate-50 p-3">
                <p className="text-slate-500">Avg Utilization</p>
                <p className={`font-semibold ${utilizationToneClass}`}>
                  {quickStats.avgUtilization}%
                </p>
              </div>
              <div className="rounded-sm bg-slate-50 p-3">
                <p className="text-slate-500">Skills</p>
                <p className="font-semibold text-slate-900">{quickStats.skillsCount}</p>
              </div>
              <div className="rounded-sm bg-slate-50 p-3">
                <p className="text-slate-500">Certifications</p>
                <p className="font-semibold text-slate-900">{quickStats.certificationsCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="rounded-sm border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Information</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("shifts")}
            className={`rounded-sm px-3 py-1.5 text-sm ${activeTab === "shifts" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            Current shifts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("timeoff")}
            className={`rounded-sm px-3 py-1.5 text-sm ${activeTab === "timeoff" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            Time-off history
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("workload")}
            className={`rounded-sm px-3 py-1.5 text-sm ${activeTab === "workload" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            Workload tracking
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("skills")}
            className={`rounded-sm px-3 py-1.5 text-sm ${activeTab === "skills" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            Skills & certifications
          </button>
        </div>

        {activeTab === "shifts" && (
          <div className="space-y-3">
            {shifts.length === 0 ? (
              <p className="text-sm text-slate-500">No shift assignment available.</p>
            ) : (
              shifts.map((item, index) => {
                const startDate = getShiftStartDate(item);
                const endDate = getShiftEndDate(item);
                return (
                  <div
                    key={`${index}-${startDate ?? "shift"}`}
                    className="rounded-sm border border-slate-200 p-3"
                  >
                    <p className="font-medium text-slate-900">{getShiftName(item)}</p>
                    <p className="text-sm text-slate-600">{getShiftTimeRange(item)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Active from {startDate} {endDate ? `to ${endDate}` : "(ongoing)"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "timeoff" && (
          <div className="space-y-3">
            {timeOffHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No time-off records available.</p>
            ) : (
              timeOffHistory.map((request, index) => {
                const start = getTimeOffStart(request);
                const end = getTimeOffEnd(request);
                return (
                  <div key={`${index}-${start}`} className="rounded-sm border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{getTimeOffType(request)}</p>
                      <span className="rounded px-2 py-0.5 text-xs bg-slate-100 text-slate-700">
                        {getTimeOffStatus(request)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {start} - {end}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "workload" && (
          <div className="space-y-3">
            {workloadHistory.length === 0 ? (
              <p className="text-sm text-slate-500">No workload records available.</p>
            ) : (
              workloadHistory.map((entry, index) => {
                const date = getWorkloadDate(entry);
                return (
                  <div key={`${index}-${date}`} className="rounded-sm border border-slate-200 p-3">
                    <p className="font-medium text-slate-900">{date}</p>
                    <p className="text-sm text-slate-600">
                      Allocated: {getWorkloadAllocated(entry)}h | Actual: {getWorkloadActual(entry)}
                      h
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Capacity utilization: {getWorkloadUtilization(entry)}%
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-900 mb-2">Skills</p>
              {skills.length === 0 ? (
                <p className="text-sm text-slate-500">No skills listed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-900 mb-2">Certifications</p>
              {certifications.length === 0 ? (
                <p className="text-sm text-slate-500">No certifications listed.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {certifications.map((cert, index) => (
                    <span
                      key={`${cert}-${index}`}
                      className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
