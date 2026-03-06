import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockFormatDateOrDash = vi.hoisted(() => vi.fn((value: string) => `fmt:${value}`));

vi.mock("@/lib/formatters/date", () => ({
  formatDateOrDash: mockFormatDateOrDash,
}));

import ContractIncidentsPanel from "@/components/contracts/detail/ContractIncidentsPanel";

function renderPanel(overrides: Record<string, unknown> = {}) {
  const onAddIncidentAction = vi.fn();
  const onEditIncidentAction = vi.fn();
  const onDeleteIncidentAction = vi.fn();

  const props = {
    incidents: [],
    canEditContracts: true,
    canDeleteContracts: true,
    isReadOnly: false,
    onAddIncidentAction,
    onEditIncidentAction,
    onDeleteIncidentAction,
    ...overrides,
  };

  return {
    ...render(<ContractIncidentsPanel {...props} />),
    onAddIncidentAction,
    onEditIncidentAction,
    onDeleteIncidentAction,
  };
}

describe("ContractIncidentsPanel", () => {
  it("renders empty state and hides add button when edit permission is missing", () => {
    renderPanel({ canEditContracts: false, canDeleteContracts: false });

    expect(screen.getByRole("heading", { name: /Related Incidents/i })).toBeInTheDocument();
    expect(screen.getByText(/No related incidents yet\./i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Incident/i })).toBeNull();
  });

  it("wires add, edit and delete actions in list mode", async () => {
    const user = userEvent.setup();
    const incident = {
      id: 77,
      title: "Outage",
      description: "Core service outage",
      severity: "critical",
      status: "open",
      reported_at: "2026-03-14T08:00:00Z",
    };

    const { onAddIncidentAction, onEditIncidentAction, onDeleteIncidentAction } = renderPanel({
      incidents: [incident],
    });

    expect(screen.getByText(/^Outage$/i)).toBeInTheDocument();
    expect(screen.getByText(/Severity: critical/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: open/i)).toBeInTheDocument();
    expect(screen.getByText(/Reported: fmt:2026-03-14T08:00:00Z/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Add Incident/i }));
    await user.click(screen.getByRole("button", { name: /^Edit$/i }));
    await user.click(screen.getByRole("button", { name: /^Delete$/i }));

    expect(onAddIncidentAction).toHaveBeenCalledTimes(1);
    expect(onEditIncidentAction).toHaveBeenCalledWith(incident);
    expect(onDeleteIncidentAction).toHaveBeenCalledWith(77);
  });

  it("respects read-only mode by disabling action buttons", () => {
    const incident = {
      id: 5,
      title: "Readonly incident",
      description: "Locked",
      severity: "low",
      status: "closed",
      reported_at: "2026-03-14T09:00:00Z",
    };

    renderPanel({ incidents: [incident], isReadOnly: true });

    expect(screen.getByRole("button", { name: /Add Incident/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Edit$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Delete$/i })).toBeDisabled();
  });

  it("shows only delete action when delete permission is present", () => {
    renderPanel({
      incidents: [
        {
          id: 10,
          title: "Delete only",
          description: "Has delete",
          severity: "medium",
          status: "open",
          reported_at: "2026-03-14T10:00:00Z",
        },
      ],
      canEditContracts: false,
      canDeleteContracts: true,
    });

    expect(screen.queryByRole("button", { name: /^Edit$/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^Delete$/i })).toBeInTheDocument();
  });
});

