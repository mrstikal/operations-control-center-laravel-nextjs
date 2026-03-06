"use client";

import { useEffect, useState } from "react";
import ModalShell from "@/components/common/ModalShell";
import SearchableSelect from "@/components/common/SearchableSelect";
import { listUsers, type User } from "@/lib/api/users";

type LifecycleAction =
  | "retire"
  | "dispose"
  | "transfer"
  | "reassign"
  | "delete"
  | "restore"
  | "hard-delete";

type AssetLifecycleModalProps = {
  isOpen: boolean;
  action: LifecycleAction;
  assetName: string;
  currentLocation?: string;
  currentDepartment?: string;
  currentAssignedToId?: number | null;
  currentAssignedToName?: string | null;
  loading: boolean;
  onCloseAction: () => void;
  onConfirmAction: (data: {
    reason: string;
    location?: string;
    department?: string;
    disposal_method?: string;
    disposal_date?: string;
    retirement_date?: string;
    assigned_to?: number;
  }) => Promise<void>;
};

export default function AssetLifecycleModal({
  isOpen,
  action,
  assetName,
  currentLocation,
  currentDepartment,
  currentAssignedToId,
  currentAssignedToName,
  loading,
  onCloseAction,
  onConfirmAction,
}: AssetLifecycleModalProps) {
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState(currentLocation || "");
  const [department, setDepartment] = useState(currentDepartment || "");
  const [disposalMethod, setDisposalMethod] = useState("");
  const [assignedTo, setAssignedTo] = useState(
    currentAssignedToId ? String(currentAssignedToId) : ""
  );
  const [retirementDate, setRetirementDate] = useState("");
  const [disposalDate, setDisposalDate] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load users for reassign action
  useEffect(() => {
    async function fetchUsers() {
      if (action !== "reassign" || !isOpen) {
        return;
      }

      setLoadingUsers(true);
      try {
        const res = await listUsers({ per_page: 100 });
        setUsers(res.data || []);
      } catch {
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }

    void fetchUsers();
  }, [action, isOpen]);

  useEffect(() => {
    if (isOpen && action === "reassign") {
      setAssignedTo(currentAssignedToId ? String(currentAssignedToId) : "");
    }
  }, [isOpen, action, currentAssignedToId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Reason is required");
      return;
    }

    if (action === "transfer" && !location.trim()) {
      setError("Location is required for transfer");
      return;
    }

    try {
      await onConfirmAction({
        reason: reason.trim(),
        ...(action === "transfer" && {
          location: location.trim(),
          department: department.trim() || undefined,
        }),
        ...(action === "dispose" &&
          disposalMethod.trim() && { disposal_method: disposalMethod.trim() }),
        ...(action === "dispose" && disposalDate && { disposal_date: disposalDate }),
        ...(action === "retire" && retirementDate && { retirement_date: retirementDate }),
        ...(action === "reassign" && assignedTo && { assigned_to: Number(assignedTo) }),
      });

      // Reset form
      setReason("");
      setLocation(currentLocation || "");
      setDepartment(currentDepartment || "");
      setDisposalMethod("");
      setAssignedTo("");
      setRetirementDate("");
      setDisposalDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason("");
      setLocation(currentLocation || "");
      setDepartment(currentDepartment || "");
      setDisposalMethod("");
      setAssignedTo("");
      setRetirementDate("");
      setDisposalDate("");
      setError(null);
      onCloseAction();
    }
  };

  const getTitle = () => {
    switch (action) {
      case "retire":
        return "Retire Asset";
      case "dispose":
        return "Dispose Asset";
      case "transfer":
        return "Transfer Asset";
      case "reassign":
        return "Reassign Asset";
      case "delete":
        return "Soft Delete Asset";
      case "restore":
        return "Restore Asset";
      case "hard-delete":
        return "Permanently Delete Asset";
      default:
        return "Confirm Action";
    }
  };

  const getDescription = () => {
    switch (action) {
      case "retire":
        return `You are about to retire "${assetName}". This will change the status to "retired".`;
      case "dispose":
        return `You are about to mark "${assetName}" as disposed. This action marks the asset as permanently removed.`;
      case "transfer":
        return `You are about to transfer "${assetName}" to a new location.`;
      case "reassign":
        return `You are about to reassign "${assetName}" to a different user.`;
      case "delete":
        return `You are about to soft delete "${assetName}". The asset can be restored later.`;
      case "restore":
        return `You are about to restore "${assetName}". The asset will be returned to active status.`;
      case "hard-delete":
        return `You are about to PERMANENTLY delete "${assetName}". This action CANNOT be undone.`;
      default:
        return "";
    }
  };

  const getButtonColor = () => {
    switch (action) {
      case "retire":
        return "bg-purple-600 hover:bg-purple-500";
      case "dispose":
        return "bg-orange-600 hover:bg-orange-500";
      case "transfer":
        return "bg-blue-600 hover:bg-blue-500";
      case "reassign":
        return "bg-indigo-600 hover:bg-indigo-500";
      case "delete":
        return "bg-amber-600 hover:bg-amber-500";
      case "restore":
        return "bg-green-600 hover:bg-green-500";
      case "hard-delete":
        return "bg-red-700 hover:bg-red-600";
      default:
        return "bg-slate-700 hover:bg-slate-600";
    }
  };

  return (
    <ModalShell isOpen={isOpen} onCloseAction={handleClose} title={getTitle()}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {getDescription()}
        </div>

        {error && (
          <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {action === "transfer" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                New Location <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g., Data Center Hall B"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                New Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g., Infrastructure"
                disabled={loading}
              />
            </div>
          </>
        )}

        {action === "dispose" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Disposal Method
              </label>
              <input
                type="text"
                value={disposalMethod}
                onChange={(e) => setDisposalMethod(e.target.value)}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                placeholder="e.g., Recycling, E-waste, Auction"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Disposal Date</label>
              <input
                type="date"
                value={disposalDate}
                onChange={(e) => setDisposalDate(e.target.value)}
                className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
                disabled={loading}
              />
            </div>
          </>
        )}

        {action === "retire" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Retirement Date</label>
            <input
              type="date"
              value={retirementDate}
              onChange={(e) => setRetirementDate(e.target.value)}
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
              disabled={loading}
            />
          </div>
        )}

        {action === "reassign" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assign To User</label>
            <div className="mb-2 text-xs text-slate-500">
              Current assignee: {currentAssignedToName || "Unassigned"}
            </div>
            {loadingUsers ? (
              <div className="rounded-sm border border-slate-300 px-3 py-2 text-sm text-slate-500">
                Loading users...
              </div>
            ) : (
              <SearchableSelect
                label=""
                options={[
                  { id: 0, label: "Unassign", value: "" },
                  ...users.map((u) => ({
                    id: u.id,
                    label: `${u.name} (${u.email})`,
                    value: String(u.id),
                  })),
                ]}
                value={assignedTo}
                onChange={(val) => setAssignedTo(String(val))}
                placeholder="Select user to assign..."
              />
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Reason <span className="text-red-600">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm"
            rows={3}
            placeholder={`Explain why you are ${action === "hard-delete" ? "permanently deleting" : action === "delete" ? "soft deleting" : action + "ing"} this asset...`}
            disabled={loading}
            required
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-sm bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300 disabled:opacity-70"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`rounded-sm px-4 py-2 text-sm text-white disabled:opacity-70 ${getButtonColor()}`}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : `Confirm ${action === "hard-delete" ? "Permanent Delete" : action === "delete" ? "Soft Delete" : action.charAt(0).toUpperCase() + action.slice(1)}`}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
