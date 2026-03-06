import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import KPICard from "@/components/KPICard";

// MaterialIcon renders a <span> with the icon name as text content – no CSS font needed
describe("KPICard – value formatting", () => {
  it("displays a plain numeric value", () => {
    render(<KPICard label="Open incidents" value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("formats a string value verbatim", () => {
    render(<KPICard label="Status" value="N/A" />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("formats values ≥ 1 000 000 with M suffix", () => {
    render(<KPICard label="Budget" value={2_500_000} />);
    expect(screen.getByText("2.5M")).toBeInTheDocument();
  });

  it("formats values ≥ 1 000 with K suffix", () => {
    render(<KPICard label="Budget" value={3_500} />);
    expect(screen.getByText("3.5K")).toBeInTheDocument();
  });

  it("formats percentage values with one decimal place and % sign", () => {
    render(<KPICard label="SLA" value={87.5} isPercentage />);
    expect(screen.getByText("87.5%")).toBeInTheDocument();
  });

  it("appends unit text when provided", () => {
    render(<KPICard label="Response time" value={15} unit="min" />);
    expect(screen.getByText("min")).toBeInTheDocument();
  });
});

describe("KPICard – trend indicator", () => {
  it("shows Growth label for trend=up", () => {
    render(<KPICard label="Contracts" value={10} trend="up" />);
    expect(screen.getByText(/Growth/i)).toBeInTheDocument();
  });

  it("shows Decline label for trend=down", () => {
    render(<KPICard label="Contracts" value={10} trend="down" />);
    expect(screen.getByText(/Decline/i)).toBeInTheDocument();
  });

  it("shows Stable label for trend=stable", () => {
    render(<KPICard label="Contracts" value={10} trend="stable" />);
    expect(screen.getByText(/Stable/i)).toBeInTheDocument();
  });

  it("shows trend percentage when trendPercent is non-zero", () => {
    render(<KPICard label="Contracts" value={10} trend="up" trendPercent={12} />);
    expect(screen.getByText(/12%/)).toBeInTheDocument();
  });

  it("does not render a trend section when trend is absent", () => {
    render(<KPICard label="Contracts" value={10} />);
    expect(screen.queryByText(/Growth|Decline|Stable/i)).not.toBeInTheDocument();
  });
});

describe("KPICard – label", () => {
  it("renders the label text", () => {
    render(<KPICard label="Open incidents" value={5} />);
    expect(screen.getByText("Open incidents")).toBeInTheDocument();
  });
});
