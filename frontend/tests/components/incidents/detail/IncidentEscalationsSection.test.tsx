import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockFormatDateOrDash = vi.hoisted(() => vi.fn((value: string) => `fmt:${value}`));

vi.mock("@/lib/formatters/date", () => ({
  formatDateOrDash: mockFormatDateOrDash,
}));

import IncidentEscalationsSection from "@/components/incidents/detail/IncidentEscalationsSection";

describe("IncidentEscalationsSection", () => {
  it("renders empty state when there are no escalations", () => {
    render(<IncidentEscalationsSection escalations={[]} />);

    expect(screen.getByRole("heading", { name: /Escalation History/i })).toBeInTheDocument();
    expect(screen.getByText(/No escalations yet\./i)).toBeInTheDocument();
  });

  it("renders escalation list with level mapping, reason fallback and optional notes", () => {
    render(
      <IncidentEscalationsSection
        escalations={[
          {
            id: 1,
            escalation_level: "level_2",
            escalated_by: { id: 10, name: "Alice" },
            escalated_to: { id: 20, name: "Bob" },
            reason: "   ",
            notes: "Escalated due to SLA breach",
            escalated_at: "2026-03-10T10:00:00Z",
          },
          {
            id: 2,
            escalation_level: "level_3",
            escalated_by: { id: 11, name: "Eve" },
            escalated_to: { id: 21, name: "Mallory" },
            reason: "Security impact",
            notes: null,
            escalated_at: "2026-03-10T12:00:00Z",
          },
        ]}
      />
    );

    expect(screen.getByText(/Escalated to Level 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Escalated to Level 3/i)).toBeInTheDocument();
    expect(screen.getByText(/^Alice$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Bob$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Eve$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Mallory$/i)).toBeInTheDocument();
    expect(screen.getByText(/Reason: —/i)).toBeInTheDocument();
    expect(screen.getByText(/Reason: Security impact/i)).toBeInTheDocument();
    expect(screen.getByText(/Notes: Escalated due to SLA breach/i)).toBeInTheDocument();

    expect(mockFormatDateOrDash).toHaveBeenNthCalledWith(1, "2026-03-10T10:00:00Z");
    expect(mockFormatDateOrDash).toHaveBeenNthCalledWith(2, "2026-03-10T12:00:00Z");
    expect(screen.getByText("fmt:2026-03-10T10:00:00Z")).toBeInTheDocument();
    expect(screen.getByText("fmt:2026-03-10T12:00:00Z")).toBeInTheDocument();
  });
});

