// app/page.tsx – root redirect
import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {

  it("renders the main element", () => {
    render(<HomePage />);
    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeInTheDocument();
  });
});
