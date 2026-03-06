import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaginationComponent from "@/components/common/Pagination";
import type { Pagination } from "@/lib/types";

const pagination: Pagination = {
  total: 100,
  per_page: 10,
  current_page: 3,
  last_page: 10,
};

function setup(overrides?: Partial<Pagination>, page = 3) {
  const onPage = vi.fn();
  const onPerPage = vi.fn();
  render(
    <PaginationComponent
      pagination={{ ...pagination, ...overrides }}
      page={page}
      perPage={10}
      onPageChangeAction={onPage}
      onPerPageChangeAction={onPerPage}
    />
  );
  return { onPage, onPerPage };
}

describe("Pagination – display", () => {
  it("shows total count and current page info", () => {
    setup();
    expect(screen.getByText(/Total 100/)).toBeInTheDocument();
    expect(screen.getByText(/Page 3 of 10/)).toBeInTheDocument();
  });

  it("renders Previous and Next buttons", () => {
    setup();
    expect(screen.getByRole("button", { name: "Previous" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("disables Previous on the first page", () => {
    setup({ current_page: 1 }, 1);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("disables Next on the last page", () => {
    setup({ current_page: 10 }, 10);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});

describe("Pagination – navigation", () => {
  it("calls onPageChangeAction with page-1 when Previous is clicked", async () => {
    const { onPage } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it("calls onPageChangeAction with page+1 when Next is clicked", async () => {
    const { onPage } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPage).toHaveBeenCalledWith(4);
  });

  it("navigates to a specific page via Go button", async () => {
    const { onPage } = setup();
    const input = screen.getByPlaceholderText("Page #");
    await userEvent.type(input, "7");
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onPage).toHaveBeenCalledWith(7);
  });

  it("does not navigate when Go is clicked with empty input", async () => {
    const { onPage } = setup();
    const goBtn = screen.getByRole("button", { name: "Go" });
    expect(goBtn).toBeDisabled();
    expect(onPage).not.toHaveBeenCalled();
  });
});
