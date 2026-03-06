"use client";

import { formatNotificationType } from "@/lib/formatters/notification";

type NotificationScheduleFormProps = {
  title: string;
  description: string;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  isReadOnly: boolean;
  name: string;
  notificationType: string;
  trigger: string;
  isActive: boolean;
  selectedRoles: string[];
  dedupeTtlMinutes: number;
  advancedMode: boolean;
  conditionsJson: string;
  recipientsJson: string;
  setNameAction: (value: string) => void;
  setNotificationTypeAction: (value: string) => void;
  setTriggerAction: (value: string) => void;
  setIsActiveAction: (value: boolean) => void;
  setSelectedRolesAction: (roles: string[]) => void;
  setDedupeTtlMinutesAction: (value: number) => void;
  setAdvancedModeAction: (value: boolean) => void;
  setConditionsJsonAction: (value: string) => void;
  setRecipientsJsonAction: (value: string) => void;
  onSubmitAction: () => void;
  onCancelAction: () => void;
};

const TRIGGER_OPTIONS = [
  "incident_assigned",
  "sla_breach",
  "maintenance_due",
  "contract_status_changed",
  "asset_retired",
];

export default function NotificationScheduleForm({
  title,
  description,
  loading,
  submitting,
  error,
  isReadOnly,
  name,
  notificationType,
  trigger,
  isActive,
  selectedRoles,
  dedupeTtlMinutes,
  advancedMode,
  conditionsJson,
  recipientsJson,
  setNameAction,
  setNotificationTypeAction,
  setTriggerAction,
  setIsActiveAction,
  setSelectedRolesAction,
  setDedupeTtlMinutesAction,
  setAdvancedModeAction,
  setConditionsJsonAction,
  setRecipientsJsonAction,
  onSubmitAction,
  onCancelAction,
}: NotificationScheduleFormProps) {
  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4 text-slate-600">Loading...</div>
      </div>
    );
  }

  function toggleRole(role: string) {
    if (selectedRoles.includes(role)) {
      setSelectedRolesAction(selectedRoles.filter((item) => item !== role));
      return;
    }

    setSelectedRolesAction([...selectedRoles, role]);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-slate-600">{description}</p>
        </div>

        <button
          type="button"
          onClick={onCancelAction}
          className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <div className="rounded-sm border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            <span className="mb-1 block text-sm font-medium text-slate-700">Name *</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setNameAction(event.target.value)}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              disabled={isReadOnly || submitting}
              placeholder="Incident assignment alert"
            />
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notification type (optional)</span>
            <input
              type="text"
              value={notificationType}
              onChange={(event) => setNotificationTypeAction(event.target.value)}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              disabled={isReadOnly || submitting}
              placeholder="Leave blank to use trigger"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Preview: {formatNotificationType(notificationType || trigger)}
            </span>
          </label>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block text-sm font-medium text-slate-700">Trigger *</span>
            <select
              value={trigger}
              onChange={(event) => setTriggerAction(event.target.value)}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              disabled={isReadOnly || submitting}
            >
              {TRIGGER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatNotificationType(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 rounded-sm border border-slate-200 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActiveAction(event.target.checked)}
              disabled={isReadOnly || submitting}
            />
            Active schedule
          </label>

          <div className="rounded-sm border border-slate-200 p-3 text-sm text-slate-700 md:col-span-2">
            <p className="mb-2 font-medium text-slate-800">Who should receive these notifications?</p>
            <div className="flex flex-wrap gap-3">
              {['Admin', 'Manager', 'Technician'].map((role) => (
                <label key={role} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    disabled={isReadOnly || submitting}
                  />
                  <span>{role}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="text-sm text-slate-700">
            <span className="mb-1 block text-sm font-medium text-slate-700">Duplicate protection window (minutes)</span>
            <input
              type="number"
              min={1}
              max={10080}
              value={dedupeTtlMinutes}
              onChange={(event) =>
                setDedupeTtlMinutesAction(Math.max(1, Math.min(10080, Number(event.target.value) || 30)))
              }
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              disabled={isReadOnly || submitting}
            />
          </label>

          <label className="flex items-center gap-2 rounded-sm border border-slate-200 p-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={advancedMode}
              onChange={(event) => setAdvancedModeAction(event.target.checked)}
              disabled={isReadOnly || submitting}
            />
            Advanced JSON mode
          </label>

          {advancedMode && (
            <label className="text-sm text-slate-700 md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Conditions JSON</span>
              <textarea
                value={conditionsJson}
                onChange={(event) => setConditionsJsonAction(event.target.value)}
                rows={10}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-xs"
                disabled={isReadOnly || submitting}
                placeholder='{"schema_version":1,"rules":[{"field":"severity","operator":"in","value":["high"]}]}'
              />
            </label>
          )}

          {advancedMode && (
            <label className="text-sm text-slate-700 md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Recipients JSON</span>
              <textarea
                value={recipientsJson}
                onChange={(event) => setRecipientsJsonAction(event.target.value)}
                rows={12}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 font-mono text-xs"
                disabled={isReadOnly || submitting}
              />
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelAction}
            className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmitAction}
            className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isReadOnly || submitting}
          >
            {submitting ? "Saving..." : "Save schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

