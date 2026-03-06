"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addIncidentComment,
  closeIncident,
  deleteIncident,
  escalateIncident,
  getIncidentAssignments,
  getIncidentById,
  getIncidentComments,
  getIncidentEscalations,
  getIncidentTimeline,
  hardDeleteIncident,
  restoreIncident,
  type IncidentAssignment,
  type IncidentComment,
  type IncidentEscalation,
  type IncidentTimelineEvent,
} from "@/lib/api/incidents";
import { listUsers, type User } from "@/lib/api/users";
import { useConfirm } from "@/lib/hooks/useConfirm";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { buildIncidentScopeOptions, buildIncidentScopeQuery } from "@/lib/incidents/scope";
import { canCloseIncident, canDelete, canEdit, canEscalateIncident } from "@/lib/permissions";
import type { Incident, Permission } from "@/lib/types";

const INITIAL_ESCALATION_FORM = {
  escalated_to: "",
  escalation_level: "level_1",
  reason: "",
  notes: "",
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useIncidentDetail(incidentId: string, scopedTenantId?: number | string | null) {
  const router = useRouter();
  const { confirmAction } = useConfirm();
  const { user, loading: currentUserLoading } = useCurrentUser();
  const { isReadOnly } = useTenantReadOnly(user);

  const permissions = useMemo<Permission[]>(() => user?.permissions || [], [user?.permissions]);
  const canEditIncidents = useMemo(() => canEdit(permissions, "incidents"), [permissions]);
  const canDeleteIncidents = useMemo(() => canDelete(permissions, "incidents"), [permissions]);
  const canCloseIncidents = useMemo(() => canCloseIncident(permissions), [permissions]);
  const canEscalateIncidents = useMemo(() => canEscalateIncident(permissions), [permissions]);
  const incidentReadScope = useMemo(() => buildIncidentScopeQuery(scopedTenantId), [scopedTenantId]);
  const incidentReadScopeOptions = useMemo(
    () => buildIncidentScopeOptions(scopedTenantId),
    [scopedTenantId]
  );

  const [incident, setIncident] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<IncidentTimelineEvent[]>([]);
  const [assignments, setAssignments] = useState<IncidentAssignment[]>([]);
  const [escalations, setEscalations] = useState<IncidentEscalation[]>([]);
  const [comments, setComments] = useState<IncidentComment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [newComment, setNewComment] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [escalationForm, setEscalationForm] = useState(INITIAL_ESCALATION_FORM);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  const clearErrorAction = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const goBackAction = useCallback(() => {
    router.back();
  }, [router]);

  const ensureWritable = useCallback(() => {
    if (!isReadOnly) {
      return true;
    }

    setErrorMessage("Tenant is archived, this page is read-only.");
    return false;
  }, [isReadOnly]);

  const refreshIncidentBundleAction = useCallback(async (id: number) => {
    const readIncidentRequest = incidentReadScope
      ? getIncidentById(id, incidentReadScope, incidentReadScopeOptions)
      : getIncidentById(id);
    const readTimelineRequest = incidentReadScope
      ? getIncidentTimeline(id, incidentReadScope, incidentReadScopeOptions)
      : getIncidentTimeline(id);
    const readAssignmentsRequest = incidentReadScope
      ? getIncidentAssignments(id, incidentReadScope, incidentReadScopeOptions)
      : getIncidentAssignments(id);
    const readEscalationsRequest = incidentReadScope
      ? getIncidentEscalations(id, incidentReadScope, incidentReadScopeOptions)
      : getIncidentEscalations(id);
    const readCommentsRequest = incidentReadScope
      ? getIncidentComments(id, incidentReadScope, incidentReadScopeOptions)
      : getIncidentComments(id);

    const [incidentRes, timelineRes, assignmentsRes, escalationsRes, commentsRes] =
      await Promise.all([
        readIncidentRequest,
        readTimelineRequest,
        readAssignmentsRequest,
        readEscalationsRequest,
        readCommentsRequest,
      ]);

    setIncident(incidentRes.data);
    setTimeline(timelineRes.data || []);
    setAssignments(assignmentsRes.data || []);
    setEscalations(escalationsRes.data || []);
    setComments(commentsRes.data || []);

    return incidentRes.data;
  }, [incidentReadScope, incidentReadScopeOptions]);

  useEffect(() => {
    async function fetchIncidentData() {
      setLoading(true);
      setLoadError(null);

      try {
        await refreshIncidentBundleAction(Number(incidentId));
      } catch (error) {
        setLoadError(getErrorMessage(error, "Failed to load incident"));
      } finally {
        setLoading(false);
      }
    }

    if (incidentId) {
      void fetchIncidentData();
    }
  }, [incidentId, refreshIncidentBundleAction]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await listUsers({ per_page: 100 });
        setUsers(response.data || []);
      } catch {
        setUsers([]);
      }
    }

    void fetchUsers();
  }, []);

  const openEscalationModalAction = useCallback(() => {
    if (!ensureWritable()) {
      return;
    }

    setErrorMessage(null);
    setShowEscalationModal(true);
  }, [ensureWritable]);

  const closeEscalationModalAction = useCallback(() => {
    if (actionLoading) {
      return;
    }

    setShowEscalationModal(false);
    setEscalationForm(INITIAL_ESCALATION_FORM);
  }, [actionLoading]);

  const updateEscalationFormAction = useCallback(
    (patch: Partial<typeof INITIAL_ESCALATION_FORM>) => {
      setEscalationForm((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const handleCloseAction = useCallback(async () => {
    if (!incident || !ensureWritable()) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      if (incidentReadScope) {
        await closeIncident(
          incident.id,
          { resolution_summary: "Closed from detail page" },
          incidentReadScope,
          incidentReadScopeOptions
        );
      } else {
        await closeIncident(incident.id, { resolution_summary: "Closed from detail page" });
      }

      const fresh = incidentReadScope
        ? await getIncidentById(incident.id, incidentReadScope, incidentReadScopeOptions)
        : await getIncidentById(incident.id);
      setIncident(fresh.data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to close incident"));
    } finally {
      setActionLoading(false);
    }
  }, [ensureWritable, incident, incidentReadScope, incidentReadScopeOptions]);

  const handleEscalateAction = useCallback(async () => {
    if (!incident || !ensureWritable()) {
      return;
    }

    if (!escalationForm.escalated_to || !escalationForm.reason.trim()) {
      setErrorMessage("Please fill in all required fields");
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      if (incidentReadScope) {
        await escalateIncident(
          incident.id,
          {
            escalated_to: Number(escalationForm.escalated_to),
            escalation_level: escalationForm.escalation_level,
            reason: escalationForm.reason,
            notes: escalationForm.notes || undefined,
          },
          incidentReadScope,
          incidentReadScopeOptions
        );
      } else {
        await escalateIncident(incident.id, {
          escalated_to: Number(escalationForm.escalated_to),
          escalation_level: escalationForm.escalation_level,
          reason: escalationForm.reason,
          notes: escalationForm.notes || undefined,
        });
      }

      await refreshIncidentBundleAction(incident.id);
      setShowEscalationModal(false);
      setEscalationForm(INITIAL_ESCALATION_FORM);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to escalate incident"));
    } finally {
      setActionLoading(false);
    }
  }, [
    ensureWritable,
    escalationForm,
    incident,
    incidentReadScope,
    incidentReadScopeOptions,
    refreshIncidentBundleAction,
  ]);

  const handleAddCommentAction = useCallback(async () => {
    if (!incident || !newComment.trim() || !ensureWritable()) {
      return;
    }

    setCommentLoading(true);
    setErrorMessage(null);

    try {
      if (incidentReadScope) {
        await addIncidentComment(
          incident.id,
          {
            comment: newComment,
            is_internal: isInternalComment,
          },
          incidentReadScope,
          incidentReadScopeOptions
        );
      } else {
        await addIncidentComment(incident.id, {
          comment: newComment,
          is_internal: isInternalComment,
        });
      }

      const response = incidentReadScope
        ? await getIncidentComments(incident.id, incidentReadScope, incidentReadScopeOptions)
        : await getIncidentComments(incident.id);
      setComments(response.data || []);
      setNewComment("");
      setIsInternalComment(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to add comment"));
    } finally {
      setCommentLoading(false);
    }
  }, [ensureWritable, incident, incidentReadScope, incidentReadScopeOptions, isInternalComment, newComment]);

  const handleSoftDeleteAction = useCallback(async () => {
    if (!incident || !ensureWritable()) {
      return;
    }

    const confirmed = await confirmAction({
      title: "Delete incident",
      message: "Are you sure you want to delete this incident?",
      confirmLabel: "Delete",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      if (incidentReadScope) {
        await deleteIncident(incident.id, incidentReadScope, incidentReadScopeOptions);
      } else {
        await deleteIncident(incident.id);
      }
      router.push("/incidents");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to delete incident"));
      setActionLoading(false);
    }
  }, [confirmAction, ensureWritable, incident, incidentReadScope, incidentReadScopeOptions, router]);

  const handleHardDeleteAction = useCallback(async () => {
    if (!incident || !ensureWritable()) {
      return;
    }

    const confirmed = await confirmAction({
      title: "Permanently delete incident",
      message: "Are you sure you want to PERMANENTLY delete this incident? This cannot be undone!",
      confirmLabel: "Permanently delete",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      if (incidentReadScope) {
        await hardDeleteIncident(incident.id, incidentReadScope, incidentReadScopeOptions);
      } else {
        await hardDeleteIncident(incident.id);
      }
      router.push("/incidents");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to permanently delete incident"));
      setActionLoading(false);
    }
  }, [confirmAction, ensureWritable, incident, incidentReadScope, incidentReadScopeOptions, router]);

  const handleRestoreAction = useCallback(async () => {
    if (!incident || !ensureWritable()) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    try {
      const restored = incidentReadScope
        ? await restoreIncident(incident.id, incidentReadScope, incidentReadScopeOptions)
        : await restoreIncident(incident.id);
      setIncident(restored.data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to restore incident"));
    } finally {
      setActionLoading(false);
    }
  }, [ensureWritable, incident, incidentReadScope, incidentReadScopeOptions]);

  return {
    incident,
    loading: loading || currentUserLoading,
    loadError,
    errorMessage,
    actionLoading,
    commentLoading,
    isReadOnly,
    permissions,
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
  };
}
