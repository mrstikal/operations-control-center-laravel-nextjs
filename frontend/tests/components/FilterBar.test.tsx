import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterBar from "@/components/common/FilterBar";
import type { FilterField } from "@/components/common/FilterBar";

const fields: FilterField[] = [
  { key: "search", label: "Search", type: "text", placeholder: "Type…" },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { label: "Open", value: "open" },
      { label: "Closed", value: "closed" },
    ],
  },
];

describe("FilterBar – rendering", () => {
  it("renders all field labels", () => {
    render(<FilterBar fields={fields} onChangeAction={vi.fn()} />);
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders a Reset filters button", () => {
    render(<FilterBar fields={fields} onChangeAction={vi.fn()} />);
    expect(screen.getByRole("button", { name: /reset filters/i })).toBeInTheDocument();
  });

  it("populates text field with initialValues", () => {
    render(
      <FilterBar fields={fields} onChangeAction={vi.fn()} initialValues={{ search: "incident" }} />
    );
    expect(screen.getByDisplayValue("incident")).toBeInTheDocument();
  });
});

describe("FilterBar – interaction", () => {
  it("calls onChangeAction when a text field is updated", async () => {
    const onChangeAction = vi.fn();
    render(<FilterBar fields={fields} onChangeAction={onChangeAction} />);
    const input = screen.getByPlaceholderText("Type…");
    await userEvent.type(input, "fire");
    // onChangeAction is called once per keystroke
    expect(onChangeAction).toHaveBeenCalled();
    const lastCall = onChangeAction.mock.calls.at(-1)![0] as Record<string, string>;
    expect(lastCall.search).toBe("fire");
  });

  it("resets all fields to their initial values on Reset click", async () => {
    const onChangeAction = vi.fn();
    render(
      <FilterBar
        fields={fields}
        onChangeAction={onChangeAction}
        initialValues={{ search: "something" }}
      />
    );

    // First type additional text to mutate state beyond initialValues
    const input = screen.getByPlaceholderText("Type…");
    await userEvent.clear(input);
    await userEvent.type(input, "new query");

    onChangeAction.mockClear();

    await userEvent.click(screen.getByRole("button", { name: /reset filters/i }));

    // Component resets back to initialValues, not to blank
    const lastCall = onChangeAction.mock.calls.at(-1)![0] as Record<string, string>;
    expect(lastCall.search).toBe("something");
    expect(lastCall.status).toBe("");
  });

  it("resets to empty strings when no initialValues are provided", async () => {
    const onChangeAction = vi.fn();
    render(<FilterBar fields={fields} onChangeAction={onChangeAction} />);

    const input = screen.getByPlaceholderText("Type…");
    await userEvent.type(input, "fire");
    onChangeAction.mockClear();

    await userEvent.click(screen.getByRole("button", { name: /reset filters/i }));

    const lastCall = onChangeAction.mock.calls.at(-1)![0] as Record<string, string>;
    expect(lastCall.search).toBe("");
    expect(lastCall.status).toBe("");
  });
});
