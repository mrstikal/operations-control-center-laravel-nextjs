"use client";

import { useCallback } from "react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ModalShell from "@/components/common/ModalShell";
import { useShiftManagement } from "@/hooks/shifts/useShiftManagement";
import { DAYS_OF_WEEK } from "@/lib/hr-constants";
import { UI_MESSAGES } from "@/lib/ui-messages";

function getDaysLabel(days: number[]) {
  if (days.length === 7) return "Every day";
  if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return "Weekdays";
  if (days.length === 2 && days.includes(6) && days.includes(7)) return "Weekends";

  return days
    .map((d) => DAYS_OF_WEEK.find((dow) => dow.value === d)?.label.substring(0, 3))
    .join(", ");
}

export default function ShiftsPage() {
  const {
    loading,
    sortedShifts,
    modalOpen,
    editingShift,
    submitting,
    canManageShifts,
    isReadOnly,
    formData,
    pendingDeleteId,
    openCreateModalAction,
    openEditModalAction,
    closeModalAction,
    updateFormFieldAction,
    toggleDayAction,
    submitShiftAction,
    requestDeleteAction,
    cancelDeleteAction,
    confirmDeleteAction,
    openShiftDetailAction,
  } = useShiftManagement();

  const handleOpenDetailsAction = useCallback(
    (shiftId: number) => {
      const shift = sortedShifts.find((item) => item.id === shiftId);
      if (!shift) {
        return;
      }

      openShiftDetailAction(shift);
    },
    [openShiftDetailAction, sortedShifts]
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="content-card">Loading shifts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Shifts Management</h1>
          <p className="text-slate-600">Manage employee work shifts and schedules</p>
        </div>
        {canManageShifts && (
          <button
            type="button"
            onClick={openCreateModalAction}
            disabled={isReadOnly}
            title={isReadOnly ? UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY : undefined}
            className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + New Shift
          </button>
        )}
      </div>

      {sortedShifts.length === 0 ? (
        <div className="rounded-sm border border-slate-200 bg-white p-12 text-center text-slate-500">
          <p>No shifts found</p>
          {canManageShifts && (
            <button
              type="button"
              onClick={openCreateModalAction}
              disabled={isReadOnly}
              title={isReadOnly ? UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY : undefined}
              className="mt-4 rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create your first shift
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedShifts.map((shift) => (
            <div
              key={shift.id}
              className={`content-card transition hover:shadow-md ${
                !shift.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleOpenDetailsAction(shift.id)}
                    className="text-left"
                  >
                    <h3 className="font-semibold text-slate-900 hover:text-slate-700">{shift.name}</h3>
                  </button>
                  {!shift.is_active && (
                    <span className="mt-1 inline-block rounded px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </div>
                {canManageShifts && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModalAction(shift)}
                      disabled={isReadOnly}
                      title={isReadOnly ? UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY : undefined}
                      className="text-base no-bg text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteAction(shift.id)}
                      disabled={isReadOnly}
                      title={isReadOnly ? UI_MESSAGES.ARCHIVED_TENANT_READ_ONLY : undefined}
                      className="text-2xl no-bg text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleOpenDetailsAction(shift.id)}
                className="w-full text-left"
              >
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-500">Time:</span>{" "}
                    <span className="font-medium text-slate-900">
                      {shift.start_time} - {shift.end_time}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Days:</span>{" "}
                    <span className="font-medium text-slate-900">
                      {getDaysLabel(shift.days_of_week)}
                    </span>
                  </div>
                  {shift.description && (
                    <div>
                      <span className="text-slate-500">Description:</span>{" "}
                      <span className="text-slate-700">{shift.description}</span>
                    </div>
                  )}
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      <ModalShell
        isOpen={modalOpen && !isReadOnly}
        onCloseAction={closeModalAction}
        title={editingShift ? "Edit Shift" : "New Shift"}
        loading={submitting}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Shift Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(event) => updateFormFieldAction({ name: event.target.value })}
              disabled={isReadOnly}
              placeholder="e.g., Morning Shift"
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start Time *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(event) => updateFormFieldAction({ start_time: event.target.value })}
                disabled={isReadOnly}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End Time *</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(event) => updateFormFieldAction({ end_time: event.target.value })}
                disabled={isReadOnly}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Days of Week *</label>
            <div className="grid grid-cols-2 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <label key={day.value} className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.days_of_week.includes(day.value)}
                    onChange={() => toggleDayAction(day.value)}
                    disabled={isReadOnly}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(event) => updateFormFieldAction({ description: event.target.value })}
              disabled={isReadOnly}
              placeholder="Optional description..."
              rows={3}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <label className="flex cursor-pointer items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(event) => updateFormFieldAction({ is_active: event.target.checked })}
              disabled={isReadOnly}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Active</span>
          </label>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={closeModalAction}
              disabled={submitting || isReadOnly}
              className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void submitShiftAction();
              }}
              disabled={
                submitting ||
                !formData.name ||
                !formData.start_time ||
                !formData.end_time ||
                formData.days_of_week.length === 0 ||
                isReadOnly
              }
              className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingShift ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </ModalShell>

      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        title="Delete shift"
        message="Are you sure you want to delete this shift?"
        confirmLabel="Delete"
        tone="danger"
        onCancelAction={cancelDeleteAction}
        onConfirmAction={() => {
          void confirmDeleteAction();
        }}
      />
    </div>
  );
}
