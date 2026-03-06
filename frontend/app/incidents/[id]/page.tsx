"use client";

import { useParams, useSearchParams } from "next/navigation";
import IncidentActions from "@/components/incidents/detail/IncidentActions";
import IncidentAssignmentsSection from "@/components/incidents/detail/IncidentAssignmentsSection";
import IncidentCommentsSection from "@/components/incidents/detail/IncidentCommentsSection";
import IncidentEscalationModal from "@/components/incidents/detail/IncidentEscalationModal";
import IncidentEscalationsSection from "@/components/incidents/detail/IncidentEscalationsSection";
import IncidentHeader from "@/components/incidents/detail/IncidentHeader";
import IncidentMetadataGrid from "@/components/incidents/detail/IncidentMetadataGrid";
import IncidentTimelineSection from "@/components/incidents/detail/IncidentTimelineSection";
import { useIncidentDetail } from "@/hooks/incidents/useIncidentDetail";

export default function IncidentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const incidentId = params.id as string;
  const scopedTenantId = searchParams.get("tenant_id");

  const {
    incident,
    loading,
    loadError,
    errorMessage,
    actionLoading,
    commentLoading,
    isReadOnly,
    timeline,
    assignments,
    escalations,
    comments,
    users,
    newComment,
    isInternalComment,
    showEscalationModal,
    escalationForm,
    canEditIncidents,
    canDeleteIncidents,
    canCloseIncidents,
    canEscalateIncidents,
    clearErrorAction,
    goBackAction,
    setNewComment,
    setIsInternalComment,
    openEscalationModalAction,
    closeEscalationModalAction,
    updateEscalationFormAction,
    handleCloseAction,
    handleEscalateAction,
    handleAddCommentAction,
    handleSoftDeleteAction,
    handleHardDeleteAction,
    handleRestoreAction,
  } = useIncidentDetail(incidentId, scopedTenantId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (loadError && !incident) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-sm border border-red-200 bg-red-50 p-4 text-red-700">
          {loadError}
        </div>
        <button
          type="button"
          onClick={goBackAction}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back
        </button>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="space-y-4 p-6">
        <div className="text-slate-500">Incident not found</div>
        <button
          type="button"
          onClick={goBackAction}
          className="rounded-sm bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-sm border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <IncidentHeader incident={incident} />

          <IncidentActions
            isDeleted={Boolean(incident.deleted_at)}
            status={incident.status}
            canEscalateIncidents={canEscalateIncidents}
            canCloseIncidents={canCloseIncidents}
            canDeleteIncidents={canDeleteIncidents}
            canEditIncidents={canEditIncidents}
            actionLoading={actionLoading}
            isReadOnly={isReadOnly}
            onEscalateAction={openEscalationModalAction}
            onCloseAction={() => {
              void handleCloseAction();
            }}
            onSoftDeleteAction={() => {
              void handleSoftDeleteAction();
            }}
            onRestoreAction={() => {
              void handleRestoreAction();
            }}
            onHardDeleteAction={() => {
              void handleHardDeleteAction();
            }}
          />
        </div>

        <IncidentMetadataGrid incident={incident} />
      </div>

      {errorMessage && (
        <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <div className="flex items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={clearErrorAction}
              className="rounded-sm border border-amber-300 bg-white px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <IncidentAssignmentsSection assignments={assignments} />
      <IncidentEscalationsSection escalations={escalations} />
      <IncidentTimelineSection timeline={timeline} />
      <IncidentCommentsSection
        comments={comments}
        newComment={newComment}
        isInternalComment={isInternalComment}
        commentLoading={commentLoading}
        isReadOnly={isReadOnly}
        onCommentChangeAction={setNewComment}
        onInternalChangeAction={setIsInternalComment}
        onAddCommentAction={() => {
          void handleAddCommentAction();
        }}
      />

      <IncidentEscalationModal
        isOpen={showEscalationModal && !isReadOnly}
        users={users}
        loading={actionLoading}
        isReadOnly={isReadOnly}
        form={escalationForm}
        onCloseAction={closeEscalationModalAction}
        onSubmitAction={() => {
          void handleEscalateAction();
        }}
        onFormChangeAction={updateEscalationFormAction}
      />
    </div>
  );
}
