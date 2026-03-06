import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGet = vi.hoisted(() => vi.fn());
const mockPost = vi.hoisted(() => vi.fn());
const mockPut = vi.hoisted(() => vi.fn());
const mockDel = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/client", () => ({
  get: mockGet,
  post: mockPost,
  put: mockPut,
  del: mockDel,
}));

import {
  addIncidentComment,
  closeIncident,
  createIncident,
  deleteIncident,
  escalateIncident,
  getIncidentAssignments,
  getIncidentById,
  getIncidentComments,
  getIncidentEscalations,
  getIncidentTimeline,
  hardDeleteIncident,
  listIncidents,
  restoreIncident,
  updateIncident,
} from "@/lib/api/incidents";

describe("incidents API helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards list, detail, create and update incident requests", async () => {
    mockGet.mockResolvedValueOnce({ success: true, message: "", data: [] }).mockResolvedValueOnce({
      success: true,
      message: "",
      data: { id: 11 },
    });
    mockPost.mockResolvedValueOnce({ success: true, message: "", data: { id: 12 } });
    mockPut.mockResolvedValueOnce({ success: true, message: "", data: { id: 12 } });

    const query = {
      search: "network",
      status: "open",
      tenant_id: 3,
      sort: "-reported_at",
      page: 4,
    };
    const options = { skipTenantHeader: true };

    await listIncidents(query, options);
    await getIncidentById(11, { tenant_id: 3 }, options);
    await createIncident({ title: "Network outage" });
    await updateIncident(12, { status: "in_progress" });

    expect(mockGet).toHaveBeenNthCalledWith(1, "/incidents", query, options);
    expect(mockGet).toHaveBeenNthCalledWith(2, "/incidents/11", { tenant_id: 3 }, options);
    expect(mockPost).toHaveBeenCalledWith("/incidents", { title: "Network outage" });
    expect(mockPut).toHaveBeenCalledWith("/incidents/12", { status: "in_progress" });
  });

  it("calls delete, restore, hard delete, close and escalation endpoints", async () => {
    mockDel.mockResolvedValue({ success: true, message: "", data: null });
    mockPost.mockResolvedValue({ success: true, message: "", data: { id: 13 } });

    await deleteIncident(13);
    await restoreIncident(13);
    await hardDeleteIncident(13);
    await closeIncident(13, { resolution_summary: "Recovered service" });
    await escalateIncident(13, {
      escalated_to: 22,
      escalation_level: "sev-1",
      reason: "Critical impact",
      notes: "Notify on-call lead",
    });

    expect(mockDel).toHaveBeenNthCalledWith(1, "/incidents/13");
    expect(mockPost).toHaveBeenNthCalledWith(1, "/incidents/13/restore");
    expect(mockDel).toHaveBeenNthCalledWith(2, "/incidents/13/hard-delete");
    expect(mockPost).toHaveBeenNthCalledWith(2, "/incidents/13/close", {
      resolution_summary: "Recovered service",
    });
    expect(mockPost).toHaveBeenNthCalledWith(3, "/incidents/13/escalate", {
      escalated_to: 22,
      escalation_level: "sev-1",
      reason: "Critical impact",
      notes: "Notify on-call lead",
    });
  });

  it("forwards timeline, assignments, escalations and comments endpoints", async () => {
    mockGet.mockResolvedValue({ success: true, message: "", data: [] });
    mockPost.mockResolvedValue({ success: true, message: "", data: { id: 1 } });

    await getIncidentTimeline(20);
    await getIncidentAssignments(20);
    await getIncidentEscalations(20);
    await getIncidentComments(20);
    await addIncidentComment(20, { comment: "Investigating", is_internal: true });

    expect(mockGet).toHaveBeenNthCalledWith(1, "/incidents/20/timeline");
    expect(mockGet).toHaveBeenNthCalledWith(2, "/incidents/20/assignments");
    expect(mockGet).toHaveBeenNthCalledWith(3, "/incidents/20/escalations");
    expect(mockGet).toHaveBeenNthCalledWith(4, "/incidents/20/comments");
    expect(mockPost).toHaveBeenCalledWith("/incidents/20/comments", {
      comment: "Investigating",
      is_internal: true,
    });
  });

  it("forwards scoped incident endpoints with tenant-aware options", async () => {
    mockGet.mockResolvedValue({ success: true, message: "", data: [] });
    mockPost.mockResolvedValue({ success: true, message: "", data: { id: 1 } });
    mockDel.mockResolvedValue({ success: true, message: "", data: null });

    const query = { tenant_id: 7 };
    const options = { skipTenantHeader: true };

    await getIncidentTimeline(20, query, options);
    await getIncidentComments(20, query, options);
    await closeIncident(20, { resolution_summary: "Recovered" }, query, options);
    await addIncidentComment(20, { comment: "Scoped", is_internal: true }, query, options);
    await hardDeleteIncident(20, query, options);

    expect(mockGet).toHaveBeenNthCalledWith(1, "/incidents/20/timeline", query, options);
    expect(mockGet).toHaveBeenNthCalledWith(2, "/incidents/20/comments", query, options);
    expect(mockPost).toHaveBeenNthCalledWith(1, "/incidents/20/close?tenant_id=7", {
      resolution_summary: "Recovered",
    }, options);
    expect(mockPost).toHaveBeenNthCalledWith(2, "/incidents/20/comments?tenant_id=7", {
      comment: "Scoped",
      is_internal: true,
    }, options);
    expect(mockDel).toHaveBeenCalledWith("/incidents/20/hard-delete?tenant_id=7", options);
  });

  it("bubbles client errors without altering them", async () => {
    const error = new Error("incident detail failed");
    mockGet.mockRejectedValueOnce(error);

    await expect(getIncidentById(404)).rejects.toBe(error);
  });
});

