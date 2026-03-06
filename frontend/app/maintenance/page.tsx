"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import MaintenanceLogForm from "@/components/assets/detail/MaintenanceLogForm";
import MaintenanceScheduleForm from "@/components/assets/detail/MaintenanceScheduleForm";
import {
  createAssetMaintenanceLog,
  createAssetMaintenanceSchedule,
  deleteAssetMaintenanceLog,
  deleteAssetMaintenanceSchedule,
  listAssets,
  listMaintenanceLogs,
  listMaintenanceSchedules,
  updateAssetMaintenanceLog,
  updateAssetMaintenanceSchedule,
} from "@/lib/api/assets";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { hasPermission } from "@/lib/permissions";
import { formatDateOrDash } from "@/lib/formatters/date";
import type { SearchableSelectOption } from "@/components/common/SearchableSelect";
import type {
  CreateMaintenanceLogPayload,
  CreateMaintenanceSchedulePayload,
  GlobalMaintenanceLogQuery,
  GlobalMaintenanceScheduleQuery,
  MaintenanceLog,
  MaintenanceSchedule,
  Pagination,
} from "@/lib/types";

type TabKey = "logs" | "schedules";

const emptyPagination: Pagination = {
  total: 0,
  per_page: 20,
  current_page: 1,
  last_page: 1,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to load data";
}

const scheduleStateBadgeClass: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-700",
  due_soon: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};

export default function MaintenanceOverviewPage() {
  const { user } = useCurrentUser();
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const canLogMaintenance = useMemo(
    () => hasPermission(permissions, "assets", "log_maintenance"),
    [permissions]
  );
  const canScheduleMaintenance = useMemo(
    () => hasPermission(permissions, "assets", "schedule_maintenance"),
    [permissions]
  );

  const [activeTab, setActiveTab] = useState<TabKey>("logs");

  // ── Asset picker options (loaded once) ────────────────────────────────────
  const [assetOptions, setAssetOptions] = useState<SearchableSelectOption[]>([]);
  useEffect(() => {
    listAssets({ per_page: 500 })
      .then((res) => {
        setAssetOptions(
          res.data.map((a) => ({ id: a.id, value: a.id, label: a.name }))
        );
      })
      .catch(() => undefined);
  }, []);

  // ── Logs ──────────────────────────────────────────────────────────────────
  const [logItems, setLogItems] = useState<MaintenanceLog[]>([]);
  const [logPagination, setLogPagination] = useState<Pagination>(emptyPagination);
  const [logPage, setLogPage] = useState(1);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logFilters, setLogFilters] = useState<GlobalMaintenanceLogQuery>({ per_page: 20 });

  // Log edit modal
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [logFormOpen, setLogFormOpen] = useState(false);
  const [logMutating, setLogMutating] = useState(false);
  const [logMutateError, setLogMutateError] = useState<string | null>(null);

  // Log create
  const [createLogAssetId, setCreateLogAssetId] = useState<number | string>("");

  // ── Schedules ─────────────────────────────────────────────────────────────
  const [scheduleItems, setScheduleItems] = useState<MaintenanceSchedule[]>([]);
  const [schedulePagination, setSchedulePagination] = useState<Pagination>(emptyPagination);
  const [schedulePage, setSchedulePage] = useState(1);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleFilters, setScheduleFilters] = useState<GlobalMaintenanceScheduleQuery>({ per_page: 20 });

  // Schedule edit modal
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null);
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [scheduleMutating, setScheduleMutating] = useState(false);
  const [scheduleMutateError, setScheduleMutateError] = useState<string | null>(null);

  // Schedule create
  const [createScheduleAssetId, setCreateScheduleAssetId] = useState<number | string>("");

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    setLogError(null);
    try {
      const response = await listMaintenanceLogs({ ...logFilters, page: logPage });
      setLogItems(response.data);
      setLogPagination(response.pagination ?? emptyPagination);
    } catch (error) {
      setLogItems([]);
      setLogError(getErrorMessage(error));
    } finally {
      setLogLoading(false);
    }
  }, [logFilters, logPage]);

  const fetchSchedules = useCallback(async () => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const response = await listMaintenanceSchedules({ ...scheduleFilters, page: schedulePage });
      setScheduleItems(response.data);
      setSchedulePagination(response.pagination ?? emptyPagination);
    } catch (error) {
      setScheduleItems([]);
      setScheduleError(getErrorMessage(error));
    } finally {
      setScheduleLoading(false);
    }
  }, [scheduleFilters, schedulePage]);

  useEffect(() => {
    if (activeTab === "logs") void fetchLogs();
  }, [activeTab, fetchLogs]);

  useEffect(() => {
    if (activeTab === "schedules") void fetchSchedules();
  }, [activeTab, fetchSchedules]);

  // ── Log actions ───────────────────────────────────────────────────────────
  function openCreateLog() {
    setEditingLog(null);
    setCreateLogAssetId("");
    setLogMutateError(null);
    setLogFormOpen(true);
  }

  function openEditLog(log: MaintenanceLog) {
    setEditingLog(log);
    setLogMutateError(null);
    setLogFormOpen(true);
  }

  function closeLogForm() {
    setLogFormOpen(false);
    setEditingLog(null);
    setLogMutateError(null);
  }

  async function handleSubmitLog(payload: CreateMaintenanceLogPayload) {
    setLogMutating(true);
    setLogMutateError(null);
    try {
      if (editingLog) {
        await updateAssetMaintenanceLog(editingLog.asset_id, editingLog.id, payload);
      } else {
        if (!createLogAssetId) {
          setLogMutateError("Please select an asset.");
          setLogMutating(false);
          return;
        }
        await createAssetMaintenanceLog(createLogAssetId, payload);
      }
      closeLogForm();
      void fetchLogs();
    } catch (err) {
      setLogMutateError(getErrorMessage(err));
    } finally {
      setLogMutating(false);
    }
  }

  async function handleDeleteLog(log: MaintenanceLog) {
    if (!window.confirm(`Delete maintenance log "${log.type}" from ${formatDateOrDash(log.performed_at)}?`)) return;
    try {
      await deleteAssetMaintenanceLog(log.asset_id, log.id);
      void fetchLogs();
    } catch (err) {
      setLogError(getErrorMessage(err));
    }
  }

  // ── Schedule actions ──────────────────────────────────────────────────────
  function openCreateSchedule() {
    setEditingSchedule(null);
    setCreateScheduleAssetId("");
    setScheduleMutateError(null);
    setScheduleFormOpen(true);
  }

  function openEditSchedule(schedule: MaintenanceSchedule) {
    setEditingSchedule(schedule);
    setScheduleMutateError(null);
    setScheduleFormOpen(true);
  }

  function closeScheduleForm() {
    setScheduleFormOpen(false);
    setEditingSchedule(null);
    setScheduleMutateError(null);
  }

  async function handleSubmitSchedule(payload: CreateMaintenanceSchedulePayload) {
    setScheduleMutating(true);
    setScheduleMutateError(null);
    try {
      if (editingSchedule) {
        await updateAssetMaintenanceSchedule(editingSchedule.asset_id, editingSchedule.id, payload);
      } else {
        if (!createScheduleAssetId) {
          setScheduleMutateError("Please select an asset.");
          setScheduleMutating(false);
          return;
        }
        await createAssetMaintenanceSchedule(createScheduleAssetId, payload);
      }
      closeScheduleForm();
      void fetchSchedules();
    } catch (err) {
      setScheduleMutateError(getErrorMessage(err));
    } finally {
      setScheduleMutating(false);
    }
  }

  async function handleDeleteSchedule(schedule: MaintenanceSchedule) {
    if (!window.confirm(`Delete schedule "${schedule.description}"?`)) return;
    try {
      await deleteAssetMaintenanceSchedule(schedule.asset_id, schedule.id);
      void fetchSchedules();
    } catch (err) {
      setScheduleError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Maintenance Overview</h1>
        <p className="mt-1 text-sm text-slate-600">Cross-asset maintenance logs and schedules.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`rounded-t-sm px-4 py-2 text-sm font-medium ${
            activeTab === "logs" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Logs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("schedules")}
          className={`rounded-t-sm px-4 py-2 text-sm font-medium ${
            activeTab === "schedules" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Schedules
        </button>
      </div>

      {/* ── LOGS TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input
                className="rounded-sm border border-slate-300 px-3 py-2 text-sm"
                placeholder="Search asset…"
                value={logFilters.asset_name ?? ""}
                onChange={(e) => { setLogPage(1); setLogFilters((prev) => ({ ...prev, asset_name: e.target.value || undefined })); }}
              />
              <select
                className="rounded-sm border border-slate-300 px-3 py-2 text-sm"
                value={logFilters.type ?? ""}
                onChange={(e) => { setLogPage(1); setLogFilters((prev) => ({ ...prev, type: (e.target.value || undefined) as MaintenanceLog["type"] | undefined })); }}
              >
                <option value="">All types</option>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="inspection">Inspection</option>
                <option value="repair">Repair</option>
              </select>
              <input type="date" className="rounded-sm border border-slate-300 px-3 py-2 text-sm" value={logFilters.from ?? ""}
                onChange={(e) => { setLogPage(1); setLogFilters((prev) => ({ ...prev, from: e.target.value || undefined })); }} />
              <input type="date" className="rounded-sm border border-slate-300 px-3 py-2 text-sm" value={logFilters.to ?? ""}
                onChange={(e) => { setLogPage(1); setLogFilters((prev) => ({ ...prev, to: e.target.value || undefined })); }} />
              <button type="button" className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => { setLogPage(1); setLogFilters({ per_page: 20 }); }}>Reset</button>
            </div>
            {canLogMaintenance && (
              <button
                type="button"
                onClick={openCreateLog}
                className="shrink-0 rounded-sm bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800"
              >
                + Log maintenance
              </button>
            )}
          </div>

          {logError && (
            <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{logError}</div>
          )}

          <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Asset</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Performed by</th>
                  <th className="px-3 py-2">Performed at</th>
                  {canLogMaintenance && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {logLoading ? (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={canLogMaintenance ? 6 : 5}>Loading logs…</td></tr>
                ) : logItems.length === 0 ? (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={canLogMaintenance ? 6 : 5}>No maintenance logs found.</td></tr>
                ) : (
                  logItems.map((log) => (
                    <tr key={log.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <Link href={`/assets/${log.asset_id}`} className="font-medium text-slate-800 hover:text-slate-600 hover:underline">
                          {log.asset?.name ?? `#${log.asset_id}`}
                        </Link>
                      </td>
                      <td className="px-3 py-2 capitalize">{log.type}</td>
                      <td className="px-3 py-2">{log.description}</td>
                      <td className="px-3 py-2">{log.performed_by_user?.name ?? `#${log.performed_by}`}</td>
                      <td className="px-3 py-2">{formatDateOrDash(log.performed_at)}</td>
                      {canLogMaintenance && (
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => openEditLog(log)}
                              className="rounded-sm border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
                            <button type="button" onClick={() => void handleDeleteLog(log)}
                              className="rounded-sm border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Total: {logPagination.total}</span>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-sm border border-slate-300 px-2 py-1 disabled:opacity-50"
                disabled={logPage <= 1 || logLoading} onClick={() => setLogPage((p) => Math.max(1, p - 1))}>Prev</button>
              <span>Page {logPagination.current_page} / {logPagination.last_page}</span>
              <button type="button" className="rounded-sm border border-slate-300 px-2 py-1 disabled:opacity-50"
                disabled={logPage >= logPagination.last_page || logLoading} onClick={() => setLogPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCHEDULES TAB ────────────────────────────────────────────────── */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <input
                className="rounded-sm border border-slate-300 px-3 py-2 text-sm"
                placeholder="Search asset…"
                value={scheduleFilters.asset_name ?? ""}
                onChange={(e) => { setSchedulePage(1); setScheduleFilters((prev) => ({ ...prev, asset_name: e.target.value || undefined })); }}
              />
              <select className="rounded-sm border border-slate-300 px-3 py-2 text-sm" value={scheduleFilters.frequency ?? ""}
                onChange={(e) => { setSchedulePage(1); setScheduleFilters((prev) => ({ ...prev, frequency: (e.target.value || undefined) as MaintenanceSchedule["frequency"] | undefined })); }}>
                <option value="">All frequencies</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
              <select className="rounded-sm border border-slate-300 px-3 py-2 text-sm" value={scheduleFilters.due_state ?? ""}
                onChange={(e) => { setSchedulePage(1); setScheduleFilters((prev) => ({ ...prev, due_state: (e.target.value || undefined) as MaintenanceSchedule["due_state"] | undefined })); }}>
                <option value="">All states</option>
                <option value="ok">OK</option>
                <option value="due_soon">Due soon</option>
                <option value="overdue">Overdue</option>
              </select>
              <select className="rounded-sm border border-slate-300 px-3 py-2 text-sm" value={scheduleFilters.overdue ? "1" : ""}
                onChange={(e) => { setSchedulePage(1); setScheduleFilters((prev) => ({ ...prev, overdue: e.target.value === "1" ? true : undefined })); }}>
                <option value="">Any due date</option>
                <option value="1">Overdue only</option>
              </select>
              <input type="date" className="rounded-sm border border-slate-300 px-3 py-2 text-sm" value={scheduleFilters.due_before ?? ""}
                onChange={(e) => { setSchedulePage(1); setScheduleFilters((prev) => ({ ...prev, due_before: e.target.value || undefined })); }} />
              <button type="button" className="rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => { setSchedulePage(1); setScheduleFilters({ per_page: 20 }); }}>Reset</button>
            </div>
            {canScheduleMaintenance && (
              <button
                type="button"
                onClick={openCreateSchedule}
                className="shrink-0 rounded-sm bg-slate-700 px-3 py-2 text-sm text-white hover:bg-slate-800"
              >
                + Add schedule
              </button>
            )}
          </div>

          {scheduleError && (
            <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{scheduleError}</div>
          )}

          <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Asset</th>
                  <th className="px-3 py-2">State</th>
                  <th className="px-3 py-2">Frequency</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Next due</th>
                  {canScheduleMaintenance && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody>
                {scheduleLoading ? (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={canScheduleMaintenance ? 6 : 5}>Loading schedules…</td></tr>
                ) : scheduleItems.length === 0 ? (
                  <tr><td className="px-3 py-3 text-slate-500" colSpan={canScheduleMaintenance ? 6 : 5}>No maintenance schedules found.</td></tr>
                ) : (
                  scheduleItems.map((schedule) => (
                    <tr key={schedule.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <Link href={`/assets/${schedule.asset_id}`} className="font-medium text-slate-800 hover:text-slate-600 hover:underline">
                          {schedule.asset?.name ?? `#${schedule.asset_id}`}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${scheduleStateBadgeClass[schedule.due_state] ?? ""}`}>
                          {schedule.due_state}
                        </span>
                      </td>
                      <td className="px-3 py-2 capitalize">{schedule.frequency}</td>
                      <td className="px-3 py-2">{schedule.description}</td>
                      <td className="px-3 py-2">{formatDateOrDash(schedule.next_due_date)}</td>
                      {canScheduleMaintenance && (
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <button type="button" onClick={() => openEditSchedule(schedule)}
                              className="rounded-sm border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
                            <button type="button" onClick={() => void handleDeleteSchedule(schedule)}
                              className="rounded-sm border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Total: {schedulePagination.total}</span>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-sm border border-slate-300 px-2 py-1 disabled:opacity-50"
                disabled={schedulePage <= 1 || scheduleLoading} onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}>Prev</button>
              <span>Page {schedulePagination.current_page} / {schedulePagination.last_page}</span>
              <button type="button" className="rounded-sm border border-slate-300 px-2 py-1 disabled:opacity-50"
                disabled={schedulePage >= schedulePagination.last_page || scheduleLoading} onClick={() => setSchedulePage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <MaintenanceLogForm
        key={editingLog?.id ?? "log-create"}
        isOpen={logFormOpen}
        editing={editingLog}
        loading={logMutating}
        error={logMutateError}
        onCloseAction={closeLogForm}
        onSubmitAction={handleSubmitLog}
        assetPickerOptions={editingLog ? undefined : assetOptions}
        selectedAssetId={editingLog ? undefined : createLogAssetId}
        onAssetIdChangeAction={editingLog ? undefined : setCreateLogAssetId}
      />

      <MaintenanceScheduleForm
        key={editingSchedule?.id ?? "schedule-create"}
        isOpen={scheduleFormOpen}
        editing={editingSchedule}
        loading={scheduleMutating}
        error={scheduleMutateError}
        onCloseAction={closeScheduleForm}
        onSubmitAction={handleSubmitSchedule}
        assetPickerOptions={editingSchedule ? undefined : assetOptions}
        selectedAssetId={editingSchedule ? undefined : createScheduleAssetId}
        onAssetIdChangeAction={editingSchedule ? undefined : setCreateScheduleAssetId}
      />
    </div>
  );
}

