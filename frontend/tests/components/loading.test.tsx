import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingSkeleton, FullPageLoading } from "@/components/loading";

describe("LoadingSkeleton", () => {
  it("renders animated skeleton rows", () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });
});

describe("FullPageLoading", () => {
  it("renders a full-page spinner overlay", () => {
    const { container } = render(<FullPageLoading />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});

