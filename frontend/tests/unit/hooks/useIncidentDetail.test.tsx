import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const mockPush = vi.hoisted(() => vi.fn());
const mockBack = vi.hoisted(() => vi.fn());
const mockConfirmAction = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock("@/lib/hooks/useConfirm", () => ({
  useConfirm: () => ({ confirmAction: mockConfirmAction }),
}));

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock("@/lib/api/users", () => ({
  listUsers: vi.fn().mockResolvedValue({ success: true, message: "", data: [] }),
}));

vi.mock("@/lib/api/incidents", () => ({
  getIncidentById: vi.fn(),
  getIncidentTimeline: vi.fn(),
  getIncidentAssignments: vi.fn(),
  getIncidentEscalations: vi.fn(),
  getIncidentComments: vi.fn(),
  closeIncident: vi.fn(),
  escalateIncident: vi.fn(),
  addIncidentComment: vi.fn(),
  deleteIncident: vi.fn(),
  restoreIncident: vi.fn(),
  hardDeleteIncident: vi.fn(),
}));

import { useIncidentDetail } from "@/hooks/incidents/useIncidentDetail";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
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
} from "@/lib/api/incidents";

const baseIncident = {
  id: 1,
  title: "Fire",
  incident_number: "INC-001",
  status: "open",
  severity: "high",
};

const editableUser = {
  user: {
    id: 1,
    tenant_id: 1,
    name: "Admin",
    email: "admin@test.local",
    tenant: { id: 1, name: "ACME" },
    permissions: [
      { resource: "incidents", action: "edit" },
      { resource: "incidents", action: "delete" },
      { resource: "incidents", action: "close" },
      { resource: "incidents", action: "escalate" },
    ],
  },
  loading: false,
  refreshAction: vi.fn(),
};

describe("useIncidentDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmAction.mockResolvedValue(true);

    vi.mocked(useCurrentUser).mockReturnValue(editableUser as ReturnType<typeof useCurrentUser>);
    vi.mocked(getIncidentById).mockResolvedValue({
      success: true,
      message: "",
      data: baseIncident,
    });
    vi.mocked(getIncidentTimeline).mockResolvedValue({ success: true, message: "", data: [] });
    vi.mocked(getIncidentAssignments).mockResolvedValue({ success: true, message: "", data: [] });
    vi.mocked(getIncidentEscalations).mockResolvedValue({ success: true, message: "", data: [] });
    vi.mocked(getIncidentComments).mockResolvedValue({ success: true, message: "", data: [] });
  });

  it("loads incident detail bundle and permissions", async () => {
    const { result } = renderHook(() => useIncidentDetail("1", "2"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(getIncidentById).toHaveBeenCalledWith(1, { tenant_id: 2 }, { skipTenantHeader: true });
    expect(getIncidentTimeline).toHaveBeenCalledWith(1, { tenant_id: 2 }, { skipTenantHeader: true });
    expect(getIncidentAssignments).toHaveBeenCalledWith(1, { tenant_id: 2 }, { skipTenantHeader: true });
    expect(getIncidentEscalations).toHaveBeenCalledWith(1, { tenant_id: 2 }, { skipTenantHeader: true });
    expect(getIncidentComments).toHaveBeenCalledWith(1, { tenant_id: 2 }, { skipTenantHeader: true });

    expect(result.current.incident?.title).toBe("Fire");
    expect(result.current.timeline).toEqual([]);
    expect(result.current.assignments).toEqual([]);
    expect(result.current.escalations).toEqual([]);
    expect(result.current.comments).toEqual([]);
    expect(result.current.canCloseIncidents).toBe(true);
    expect(result.current.canEscalateIncidents).toBe(true);
  });

  it("closes incident and refreshes incident state", async () => {
    vi.mocked(getIncidentById)
      .mockResolvedValueOnce({ success: true, message: "", data: baseIncident })
      .mockResolvedValueOnce({
        success: true,
        message: "",
        data: { ...baseIncident, status: "closed" },
      });

    const { result } = renderHook(() => useIncidentDetail("1", "2"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleCloseAction();
    });

    expect(closeIncident).toHaveBeenCalledWith(1, {
      resolution_summary: "Closed from detail page",
    }, { tenant_id: 2 }, { skipTenantHeader: true });
    await waitFor(() => expect(result.current.incident?.status).toBe("closed"));
  });

  it("validates escalation required fields", async () => {
    const { result } = renderHook(() => useIncidentDetail("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleEscalateAction();
    });

    expect(escalateIncident).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBe("Please fill in all required fields");
  });

  it("posts comment and resets comment input", async () => {
    const { result } = renderHook(() => useIncidentDetail("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.setNewComment("Investigating now");
      result.current.setIsInternalComment(true);
    });

    await act(async () => {
      await result.current.handleAddCommentAction();
    });

    expect(addIncidentComment).toHaveBeenCalledWith(1, {
      comment: "Investigating now",
      is_internal: true,
    });
    expect(result.current.newComment).toBe("");
    expect(result.current.isInternalComment).toBe(false);
  });

  it("soft-deletes incident and redirects", async () => {
    const { result } = renderHook(() => useIncidentDetail("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSoftDeleteAction();
    });

    expect(deleteIncident).toHaveBeenCalledWith(1);
    expect(mockPush).toHaveBeenCalledWith("/incidents");
  });
});
