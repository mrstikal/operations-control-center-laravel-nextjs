import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ArchivedTenantBanner from "@/components/common/ArchivedTenantBanner";

describe("ArchivedTenantBanner", () => {
  it("renders the tenant name in bold", () => {
    render(<ArchivedTenantBanner tenantName="Acme Corp" />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("indicates the page is read-only", () => {
    render(<ArchivedTenantBanner tenantName="Test Tenant" />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  it("renders with amber warning styling", () => {
    const { container } = render(<ArchivedTenantBanner tenantName="X" />);
    const banner = container.firstChild as HTMLElement;
    expect(banner.className).toContain("amber");
  });
});
