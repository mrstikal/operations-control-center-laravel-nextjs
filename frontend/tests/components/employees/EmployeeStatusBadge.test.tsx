import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import EmployeeStatusBadge from "@/components/employees/EmployeeStatusBadge";

describe("EmployeeStatusBadge", () => {
  it("renders deleted badge when employee is archived", () => {
    const { container } = render(
      <EmployeeStatusBadge employee={{ id: 1, deleted_at: "2026-03-01T00:00:00Z" }} />
    );

    expect(screen.getByText(/^Deleted$/i)).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("bg-red-100", "text-red-800");
  });

  it("renders formatted availability label for known status", () => {
    const { container } = render(
      <EmployeeStatusBadge employee={{ id: 2, availability_status: "on_maintenance" }} />
    );

    expect(screen.getByText(/^On Maintenance$/i)).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("bg-blue-100", "text-blue-800");
  });

  it("uses fallback color class for unknown status values", () => {
    const { container } = render(
      <EmployeeStatusBadge employee={{ id: 3, availability_status: "custom_status" as never }} />
    );

    expect(screen.getByText(/^Custom Status$/i)).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("bg-gray-100", "text-gray-800");
  });

  it("falls back to unavailable when status is missing", () => {
    const { container } = render(<EmployeeStatusBadge employee={{ id: 4 }} />);

    expect(screen.getByText(/^Unavailable$/i)).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("bg-red-100", "text-red-800");
  });
});

