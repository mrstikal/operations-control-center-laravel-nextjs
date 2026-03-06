import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Logo from "@/components/header/Logo";

describe("Logo", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("passes extra SVG props (className, aria-hidden)", () => {
    const { container } = render(<Logo className="h-12" aria-hidden="true" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.classList.contains("h-12")).toBe(true);
  });

  it("has correct default viewBox", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "viewBox",
      "17.987 88.655 261.742 123.594"
    );
  });
});

