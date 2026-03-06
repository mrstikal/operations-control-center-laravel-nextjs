"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getMe } from "@/lib/api";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import {
  archiveTimeOffRequest,
  decideTimeOffRequest,
  getTimeOffRequestById,
  type TimeOffRequest,
} from "@/lib/api/timeOff";
import ModalShell from "@/components/common/ModalShell";
import { formatDate, formatDateRange } from "@/lib/formatters/date";
import { TIME_OFF_STATUS_COLORS } from "@/lib/hr-constants";
import {
  getRequestEmployeeDepartment,
  getRequestEmployeeEmail,
  getRequestEmployeeName,
  getRequestEmployeePosition,
} from "@/lib/hr-normalizers";
import type { Me } from "@/lib/types";

export default function TimeOffDetailPage() {
  const router = useRouter();
  const { confirmAction } = useConfirm();
  const { successAction, errorAction } = useToast();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<TimeOffRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentHighestRoleLevel, setCurrentHighestRoleLevel] = useState(0);
  const [currentIsSuperadmin, setCurrentIsSuperadmin] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const { isReadOnly } = useTenantReadOnly(me);

  // Decision modal state
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    action: "approve" | "reject" | null;
  }>({ open: false, action: null });
  const [approvalNote, setApprovalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadCurrentUserContext() {
      try {
        const me = await getMe();
        setMe(me.data);
        const roles = me.data.roles ?? [];
        const highest = roles.reduce((max, role) => Math.max(max, role.level), 0);
        setCurrentUserId(me.data.id);
        setCurrentHighestRoleLevel(highest);
        setCurrentIsSuperadmin(roles.some((role) => role.name === "Superadmin"));
      } catch (error) {
        console.error("Failed to load user context:", error);
      }
    }

    void loadCurrentUserContext();
  }, []);

  useEffect(() => {
    async function fetchRequest() {
      try {
        setLoading(true);
        const response = await getTimeOffRequestById(id);
        setRequest(response.data);
      } catch (err) {
        console.error("Failed to fetch time-off request:", err);
        setError(err instanceof Error ? err.message : "Failed to load request");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      void fetchRequest();
    }
  }, [id]);

  const canDecideRequest = useCallback((): boolean => {
    if (isReadOnly) {
      return false;
    }

    if (!request || request.status !== "pending") {
      return false;
    }

    // Lower than Manager never sees actions.
    if (currentHighestRoleLevel < 3) {
      return false;
    }

    const targetUserId = request.employee?.user?.id ?? null;
    const targetHighest = Math.max(
      ...(request.employee?.user?.roles ?? []).map((r) => r.level || 0),
      0
    );
    const isSelf = targetUserId !== null && targetUserId === currentUserId;

    // Exception: Superadmin can decide own request.
    if (currentIsSuperadmin && isSelf) {
      return true;
    }

    // Manager+ only subordinate roles.
    return targetHighest < currentHighestRoleLevel;
  }, [request, currentHighestRoleLevel, currentIsSuperadmin, currentUserId, isReadOnly]);

  const handleDecision = async () => {
    if (!request || !decisionModal.action) return;
    if (isReadOnly) return;

    try {
      setSubmitting(true);
      await decideTimeOffRequest(request.id, {
        status: decisionModal.action === "approve" ? "approved" : "rejected",
        approval_note: approvalNote || undefined,
      });

      successAction(`Request ${decisionModal.action}d successfully`);
      setDecisionModal({ open: false, action: null });
      setApprovalNote("");

      // Reload request data
      const response = await getTimeOffRequestById(id);
      setRequest(response.data);
    } catch (err) {
      console.error("Failed to process request:", err);
      errorAction("Failed to process request");
    } finally {
      setSubmitting(false);
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4">Loading...</div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <button
          onClick={() => router.push("/time-off")}
          className="rounded-sm border! border-slate-300! bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          ← Back to List
        </button>
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          {error || "Request not found"}
        </div>
      </div>
    );
  }

  const statusColorClass = TIME_OFF_STATUS_COLORS[request.status] || "bg-gray-100 text-gray-800";
  const typeLabel = request.type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Time-Off Request #{request.id}</h1>
          <p className="text-slate-600">View details and approval information</p>
        </div>
        <button
          onClick={() => router.push("/time-off")}
          className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          ← Back to List
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Section */}
          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Employee</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-600">Name</label>
                <p className="mt-1 text-slate-900">{getRequestEmployeeName(request)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Email</label>
                <p className="mt-1 text-slate-900">{getRequestEmployeeEmail(request)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Position</label>
                <p className="mt-1 text-slate-900">{getRequestEmployeePosition(request)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Department</label>
                <p className="mt-1 text-slate-900">{getRequestEmployeeDepartment(request)}</p>
              </div>
            </div>
          </div>

          {/* Request Details Section */}
          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Request Details</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Type</label>
                  <p className="mt-1 text-slate-900">{typeLabel}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Period</label>
                  <p className="mt-1 text-slate-900">
                    {formatDateRange(request.start_date, request.end_date)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Start Date</label>
                  <p className="mt-1 text-slate-900">{formatDate(request.start_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">End Date</label>
                  <p className="mt-1 text-slate-900">{formatDate(request.end_date)}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Duration</label>
                <p className="mt-1 text-slate-900">
                  {calculateDays(request.start_date, request.end_date)} days
                </p>
              </div>
            </div>
          </div>

          {/* Reason Section */}
          {request.reason && (
            <div className="rounded-sm border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Reason</h2>
              <p className="whitespace-pre-wrap text-slate-700">{request.reason}</p>
            </div>
          )}

          {/* Approval Note Section */}
          {request.approval_note && (
            <div className="rounded-sm border border-blue-200 bg-blue-50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-blue-900">Approval Note</h2>
              <p className="whitespace-pre-wrap text-blue-800">{request.approval_note}</p>
            </div>
          )}
        </div>

        {/* Right Column - Status & Timeline */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Status</h2>
            <div className="space-y-4">
              <div
                className={`inline-block rounded px-3 py-2 text-sm font-medium ${statusColorClass}`}
              >
                {request.status.toUpperCase()}
              </div>

              {/* Action Buttons */}
              {canDecideRequest() && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setDecisionModal({ open: true, action: "approve" })}
                    disabled={isReadOnly}
                    className="rounded-sm bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setDecisionModal({ open: true, action: "reject" })}
                    disabled={isReadOnly}
                    className="rounded-sm bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}

              {/* Archive Button (Admin/Superadmin) */}
              {(currentIsSuperadmin || (currentHighestRoleLevel >= 4 && !request.archived_at)) && (
                <button
                  onClick={async () => {
                    if (isReadOnly) return;
                    const confirmed = await confirmAction({
                      title: "Archive request",
                      message: "Archive this time-off request?",
                      confirmLabel: "Archive",
                      tone: "danger",
                    });
                    if (!confirmed) return;
                    try {
                      await archiveTimeOffRequest(request.id);
                      const response = await getTimeOffRequestById(id);
                      setRequest(response.data);
                      successAction("Request archived successfully");
                    } catch {
                      errorAction("Failed to archive request");
                    }
                  }}
                  disabled={isReadOnly}
                  className="ml-2 rounded-sm bg-slate-400 px-4 py-2.5 text-sm text-white hover:bg-slate-500"
                >
                  Archive
                </button>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-sm border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Timeline</h2>
            <div className="space-y-4">
              {/* Requested */}
              <div className="border-l-2 border-slate-300 pl-4">
                <p className="text-xs font-medium text-slate-500">REQUESTED</p>
                <p className="mt-1 text-sm text-slate-900">{formatDate(request.requested_at)}</p>
                {request.requestedBy?.name && (
                  <p className="mt-1 text-xs text-slate-600">by {request.requestedBy.name}</p>
                )}
              </div>

              {/* Decided */}
              {request.status !== "pending" && request.decided_at && (
                <div className="border-l-2 border-slate-300 pl-4">
                  <p className="text-xs font-medium text-slate-500">
                    {request.status === "approved" ? "APPROVED" : "REJECTED"}
                  </p>
                  <p className="mt-1 text-sm text-slate-900">{formatDate(request.decided_at)}</p>
                  {request.approvedBy?.name && (
                    <p className="mt-1 text-xs text-slate-600">by {request.approvedBy.name}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Modal */}
      <ModalShell
        isOpen={decisionModal.open && !isReadOnly}
        onCloseAction={() => setDecisionModal({ open: false, action: null })}
        title={`${decisionModal.action === "approve" ? "Approve" : "Reject"} Time-Off Request`}
        loading={submitting}
      >
        {decisionModal.action && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Are you sure you want to{" "}
              <span className="font-semibold">
                {decisionModal.action === "approve" ? "approve" : "reject"} this request?
              </span>
            </p>
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              disabled={isReadOnly}
              rows={3}
              placeholder="Optional: Enter an approval note..."
              className="w-full rounded-sm border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDecisionModal({ open: false, action: null })}
                disabled={isReadOnly}
                className="rounded-sm border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDecision}
                disabled={submitting || isReadOnly}
                className={`rounded-sm px-4 py-2 text-white disabled:opacity-50 ${
                  decisionModal.action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting ? "Processing..." : `Confirm ${decisionModal.action?.toUpperCase()}`}
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
}
