import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.hoisted(() => vi.fn());
const mockUseCurrentUser = vi.hoisted(() => vi.fn());
const mockIsReadOnly = vi.hoisted(() => vi.fn(() => false));
const mockGetById = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/hooks/useCurrentUser", () => ({
  useCurrentUser: () => mockUseCurrentUser(),
}));

vi.mock("@/lib/hooks/useTenantReadOnly", () => ({
  useTenantReadOnly: () => ({
    isReadOnly: mockIsReadOnly(),
  }),
}));

vi.mock("@/lib/api/notificationSchedules", () => ({
  getNotificationScheduleById: mockGetById,
  createNotificationSchedule: mockCreate,
  updateNotificationSchedule: mockUpdate,
}));

import { useNotificationScheduleForm } from "@/hooks/notifications/useNotificationScheduleForm";
import type { NotificationSchedule } from "@/lib/types";

const baseUser = { id: 4, tenant_id: 1, name: "Eve", email: "eve@occ.local" };

const existingSchedule: NotificationSchedule = {
  id: 88,
  tenant_id: 1,
  name: "SLA Breach Notifier",
  notification_type: "sla.breach",
  trigger: "sla_breach",
  is_active: true,
  conditions: {
    schema_version: 1,
    rules: [{ field: "sla_breached", operator: "eq", value: true }],
  },
  recipients: {
    schema_version: 1,
    roles: ["Admin"],
    channels: ["in_app"],
  },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-03-14T00:00:00Z",
};

describe("useNotificationScheduleForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({ user: baseUser, loading: false });
    mockIsReadOnly.mockReturnValue(false);

    mockCreate.mockResolvedValue({ success: true, message: "", data: { ...existingSchedule, id: 100 } });
    mockUpdate.mockResolvedValue({ success: true, message: "", data: existingSchedule });
  });

  describe("create mode", () => {
    it("starts with sensible default initial state", () => {
      const { result } = renderHook(() =>
        useNotificationScheduleForm({ mode: "create" })
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.name).toBe("");
      expect(result.current.trigger).toBe("incident_assigned");
      expect(result.current.isActive).toBe(true);
      expect(result.current.selectedRoles).toEqual(["Manager"]);
      expect(result.current.isEditMode).toBe(false);
    });

    it("validates required fields before submitting", async () => {
      const { result } = renderHook(() =>
        useNotificationScheduleForm({ mode: "create" })
      );

      await act(async () => {
        await result.current.submitAction();
      });

      expect(result.current.error).toMatch(/name.*required|required.*name/i);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("submits create payload and navigates to list", async () => {
      const { result } = renderHook(() =>
        useNotificationScheduleForm({ mode: "create" })
      );

      act(() => {
        result.current.setName("My Schedule");
        result.current.setNotificationType("incident.alert");
        result.current.setTrigger("incident_assigned");
      });

      await act(async () => {
        await result.current.submitAction();
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Schedule",
          notification_type: "incident.alert",
          trigger: "incident_assigned",
          is_active: true,
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/notification-schedules");
    });

    it("validates selectedRoles when advanced mode is off", async () => {
      const { result } = renderHook(() =>
        useNotificationScheduleForm({ mode: "create" })
      );

      act(() => {
        result.current.setName("No Roles Schedule");
        result.current.setNotificationType("test");
        result.current.setSelectedRoles([]);
      });

      await act(async () => {
        await result.current.submitAction();
      });

      expect(result.current.error).toMatch(/role/i);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("validates invalid advanced JSON before submitting", async () => {
      const { result } = renderHook(() =>
        useNotificationScheduleForm({ mode: "create" })
      );

      act(() => {
        result.current.setName("Adv Schedule");
        result.current.setNotificationType("sla.breach");
        result.current.setAdvancedMode(true);
        result.current.setConditionsJson("{invalid json");
      });

      await act(async () => {
        await result.current.submitAction();
      });

      expect(result.current.error).toMatch(/conditions.*invalid|invalid.*conditions/i);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("navigates to list on cancel", async () => {
      const { result } = renderHook(() =>
        useNotificationScheduleForm({ mode: "create" })
      );

      await act(async () => {
        result.current.cancelAction();
      });

      expect(mockPush).toHaveBeenCalledWith("/notification-schedules");
    });
  });

  describe("edit mode", () => {
    beforeEach(() => {
      mockGetById.mockResolvedValue({ success: true, message: "", data: existingSchedule });
    });

    it("loads existing schedule and populates form fields", async () => {
      const { result } = renderHook(() =>
        useNotificationScheduleForm({ mode: "edit", scheduleId: "88" })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.name).toBe("SLA Breach Notifier");
      expect(result.current.trigger).toBe("sla_breach");
      expect(result.current.notificationType).toBe("sla.breach");
      expect(result.current.isEditMode).toBe(true);
      expect(result.current.selectedRoles).toEqual(["Admin"]);
    });

    it("submits update payload and navigates to list", async () => {
      const { result } = renderHook(() =>
        useNotificationScheduleForm({ mode: "edit", scheduleId: "88" })
      );
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setName("SLA Breach Notifier v2");
      });

      await act(async () => {
        await result.current.submitAction();
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        "88",
        expect.objectContaining({ name: "SLA Breach Notifier v2" })
      );
      expect(mockPush).toHaveBeenCalledWith("/notification-schedules");
    });

    it("sets error when load fails", async () => {
      mockGetById.mockRejectedValue(new Error("Not found"));

      const { result } = renderHook(() =>
        useNotificationScheduleForm({ mode: "edit", scheduleId: "88" })
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe("Not found");
    });
  });

  describe("read-only tenant", () => {
    it("does not submit when tenant is read-only", async () => {
      mockIsReadOnly.mockReturnValue(true);

      const { result } = renderHook(() =>
        useNotificationScheduleForm({ mode: "create" })
      );

      act(() => {
        result.current.setName("Blocked");
        result.current.setNotificationType("test");
      });

      await act(async () => {
        await result.current.submitAction();
      });

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});

