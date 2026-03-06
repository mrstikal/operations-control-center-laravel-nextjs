"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { decideTimeOffRequest, listTimeOffRequests, type TimeOffRequest } from "@/lib/api/timeOff";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useHRMetadata } from "@/lib/hooks/useHRMetadata";
import { useTenantReadOnly } from "@/lib/hooks/useTenantReadOnly";
import { useToast } from "@/lib/hooks/useToast";
import type { Pagination } from "@/lib/types";

const INITIAL_PAGINATION: Pagination = {
  total: 0,
  per_page: 15,
  current_page: 1,
  last_page: 1,
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useTimeOffManagement() {
  const router = useRouter();
  const { successAction, errorAction } = useToast();
  const { user, loading: currentUserLoading } = useCurrentUser();
  const { metadata, loading: metadataLoading } = useHRMetadata();
  const { isReadOnly } = useTenantReadOnly(user);

  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({
    status: "",
    type: "",
    from_date: "",
    to_date: "",
  });
  const [sort, setSort] = useState("requested_at:desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [pagination, setPagination] = useState<Pagination>(INITIAL_PAGINATION);

  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    request: TimeOffRequest | null;
    action: "approve" | "reject" | null;
  }>({ open: false, request: null, action: null });
  const [approvalNote, setApprovalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentUserId = useMemo(() => user?.id ?? null, [user?.id]);
  const currentHighestRoleLevel = useMemo(
    () => (user?.roles ?? []).reduce((max, role) => Math.max(max, role.level), 0),
    [user?.roles]
  );
  const currentIsSuperadmin = useMemo(
    () => (user?.roles ?? []).some((role) => role.name === "Superadmin"),
    [user?.roles]
  );

  const loadRequestsAction = useCallback(async () => {
    try {
      setRequestsLoading(true);

      const [sortByRaw, sortOrderRaw] = sort.split(":");
      const response = await listTimeOffRequests({
        ...filters,
        page,
        per_page: perPage,
        sort_by: sortByRaw || "requested_at",
        sort_order: sortOrderRaw || "desc",
      });

      setRequests(Array.isArray(response.data) ? response.data : []);
      setPagination(
        response.pagination ?? {
          total: Array.isArray(response.data) ? response.data.length : 0,
          per_page: perPage,
          current_page: page,
          last_page: 1,
        }
      );
    } catch (loadError) {
      console.error("Failed to fetch time-off requests:", loadError);
      setRequests([]);
      setPagination({
        total: 0,
        per_page: perPage,
        current_page: page,
        last_page: 1,
      });
      errorAction(getErrorMessage(loadError, "Failed to load time-off requests"));
    } finally {
      setRequestsLoading(false);
    }
  }, [errorAction, filters, page, perPage, sort]);

  useEffect(() => {
    void loadRequestsAction();
  }, [loadRequestsAction]);

  const handleFilterChangeAction = useCallback((nextFilters: Record<string, string>) => {
    setFilters(nextFilters);
    setPage(1);
  }, []);

  const handleSortChangeAction = useCallback((nextSort: string) => {
    setSort(nextSort);
    setPage(1);
  }, []);

  const openDecisionModalAction = useCallback(
    (request: TimeOffRequest, action: "approve" | "reject") => {
      if (isReadOnly) {
        return;
      }

      setDecisionModal({ open: true, request, action });
    },
    [isReadOnly]
  );

  const closeDecisionModalAction = useCallback(() => {
    if (submitting) {
      return;
    }

    setDecisionModal({ open: false, request: null, action: null });
    setApprovalNote("");
  }, [submitting]);

  const submitDecisionAction = useCallback(async () => {
    if (!decisionModal.request || !decisionModal.action || isReadOnly) {
      return;
    }

    try {
      setSubmitting(true);

      await decideTimeOffRequest(decisionModal.request.id, {
        status: decisionModal.action === "approve" ? "approved" : "rejected",
        approval_note: approvalNote || undefined,
      });

      successAction(`Request ${decisionModal.action}d successfully`);
      closeDecisionModalAction();
      await loadRequestsAction();
    } catch (submitError) {
      console.error("Failed to process request:", submitError);
      errorAction(getErrorMessage(submitError, "Failed to process request"));
    } finally {
      setSubmitting(false);
    }
  }, [
    approvalNote,
    closeDecisionModalAction,
    decisionModal.action,
    decisionModal.request,
    errorAction,
    isReadOnly,
    loadRequestsAction,
    successAction,
  ]);

  const canDecideRequest = useCallback(
    (request: TimeOffRequest): boolean => {
      if (request.status !== "pending") {
        return false;
      }

      if (currentHighestRoleLevel < 3) {
        return false;
      }

      const targetUserId = request.employee?.user?.id ?? null;
      const targetHighestRole = Math.max(
        0,
        ...(request.employee?.user?.roles ?? []).map((role) => role.level)
      );
      const isSelfRequest = targetUserId !== null && targetUserId === currentUserId;

      if (currentIsSuperadmin && isSelfRequest) {
        return true;
      }

      return targetHighestRole < currentHighestRoleLevel;
    },
    [currentHighestRoleLevel, currentIsSuperadmin, currentUserId]
  );

  const viewRequestAction = useCallback(
    (request: TimeOffRequest) => {
      router.push(`/time-off/${request.id}`);
    },
    [router]
  );

  const goToCreateRequestAction = useCallback(() => {
    router.push("/time-off/create");
  }, [router]);

  return {
    requests,
    loading: requestsLoading || metadataLoading || currentUserLoading,
    metadata,
    sort,
    page,
    perPage,
    pagination,
    decisionModal,
    approvalNote,
    submitting,
    isReadOnly,
    setPage,
    setPerPage,
    setApprovalNote,
    handleFilterChangeAction,
    handleSortChangeAction,
    openDecisionModalAction,
    closeDecisionModalAction,
    submitDecisionAction,
    canDecideRequest,
    viewRequestAction,
    goToCreateRequestAction,
  };
}

