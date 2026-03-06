import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseNotificationManagement = vi.hoisted(() => vi.fn());
const mockUseNotificationDetail = vi.hoisted(() => vi.fn());

const markAllReadAction = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const markReadAction = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const viewNotificationAction = vi.hoisted(() => vi.fn());
const goBackAction = vi.hoisted(() => vi.fn());
const openActionUrlAction = vi.hoisted(() => vi.fn());
const detailMarkReadAction = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: "42" }),
}));

vi.mock("@/hooks/notifications/useNotificationManagement", () => ({
  useNotificationManagement: mockUseNotificationManagement,
}));

vi.mock("@/hooks/notifications/useNotificationDetail", () => ({
  useNotificationDetail: mockUseNotificationDetail,
}));

vi.mock("@/components/common/FilterBar", () => ({
  default: () => <div data-testid="filter-bar" />,
}));

vi.mock("@/components/common/Pagination", () => ({
  default: () => <div data-testid="pagination" />,
}));

vi.mock("@/components/common/DataTable", () => ({
  default: ({ data, actions }: { data: Array<{ id: number; title: string; read: boolean }>; actions: Array<{ label: string; onClick: (row: { id: number; title: string; read: boolean }) => void; isVisible?: (row: { id: number; title: string; read: boolean }) => boolean }> }) => (
    <div>
      {data.map((row) => (
        <div key={row.id}>
          <span>{row.title}</span>
          {actions
            .filter((action) => (action.isVisible ? action.isVisible(row) : true))
            .map((action) => (
              <button key={`${row.id}-${action.label}`} onClick={() => action.onClick(row)}>
                {action.label}
              </button>
            ))}
        </div>
      ))}
    </div>
  ),
}));

import NotificationsPage from "@/app/notifications/page";
import NotificationDetailPage from "@/app/notifications/[id]/page";

describe("Notifications routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseNotificationManagement.mockReturnValue({
      notifications: [
        {
          id: 1,
          title: "Incident assigned",
          message: "A new incident has been assigned.",
          type: "incident_assigned",
          priority: "high",
          read: false,
          created_at: "2026-03-14T12:00:00Z",
        },
      ],
      loading: false,
      page: 1,
      perPage: 20,
      pagination: { total: 1, per_page: 20, current_page: 1, last_page: 1 },
      users: [],
      canFilterByUser: false,
      unreadCount: 3,
      isReadOnly: false,
      setPage: vi.fn(),
      setPerPage: vi.fn(),
      handleFilterChangeAction: vi.fn(),
      viewNotificationAction,
      markReadAction,
      markAllReadAction,
    });

    mockUseNotificationDetail.mockReturnValue({
      notification: {
        id: 42,
        title: "Incident assigned",
        message: "Open detail",
        type: "incident_assigned",
        priority: "medium",
        read: false,
        created_at: "2026-03-14T12:00:00Z",
        read_at: null,
        data: { incident_id: 555 },
        action_url: "/incidents/555",
        notifiable_type: "incident",
        notifiable_id: 555,
      },
      loading: false,
      error: null,
      actionUrl: "/incidents/555",
      isReadOnly: false,
      markingRead: false,
      goBackAction,
      openActionUrlAction,
      markReadAction: detailMarkReadAction,
    });
  });

  it("list route triggers mark all/detail/mark-read actions", async () => {
    const user = userEvent.setup();
    render(<NotificationsPage />);

    expect(screen.getByRole("heading", { name: /Notifications/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Mark all read/i }));
    await user.click(screen.getByRole("button", { name: "Detail" }));
    await user.click(screen.getByRole("button", { name: "Mark read" }));

    expect(markAllReadAction).toHaveBeenCalledTimes(1);
    expect(viewNotificationAction).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(markReadAction).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("detail route renders message and triggers primary actions", async () => {
    const user = userEvent.setup();
    render(<NotificationDetailPage />);

    expect(screen.getByRole("heading", { name: /Notification detail/i })).toBeInTheDocument();
    expect(screen.getByText(/Open detail/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Mark as read/i }));
    await user.click(screen.getByRole("button", { name: /Open target/i }));
    await user.click(screen.getByRole("button", { name: /^Back$/i }));

    expect(detailMarkReadAction).toHaveBeenCalledTimes(1);
    expect(openActionUrlAction).toHaveBeenCalledTimes(1);
    expect(goBackAction).toHaveBeenCalledTimes(1);
  });

  it("detail route renders error fallback with back action", async () => {
    const user = userEvent.setup();
    mockUseNotificationDetail.mockReturnValue({
      notification: null,
      loading: false,
      error: "Not found",
      actionUrl: null,
      isReadOnly: false,
      markingRead: false,
      goBackAction,
      openActionUrlAction,
      markReadAction: detailMarkReadAction,
    });

    render(<NotificationDetailPage />);

    expect(screen.getByText(/Not found/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Back to notifications/i }));
    expect(goBackAction).toHaveBeenCalledTimes(1);
  });
});

