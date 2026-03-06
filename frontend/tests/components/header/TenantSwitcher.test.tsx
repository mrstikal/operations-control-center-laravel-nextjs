import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const onTenantChangeAction = vi.fn();

vi.mock("@/components/common/SearchableSelect", () => ({
  default: ({ onChange, disabled }: { onChange: (value: string | number) => void; disabled?: boolean }) => (
    <button disabled={disabled} onClick={() => onChange("all")}>
      Tenant select
    </button>
  ),
}));

import TenantSwitcher from "@/components/header/TenantSwitcher";

describe("TenantSwitcher", () => {
  it("does not render when tenant switching is disabled", () => {
    const { container } = render(
      <TenantSwitcher
        allTenantsValue="all"
        canSwitchTenant={false}
        onTenantChangeAction={onTenantChangeAction}
        selectedTenantId="all"
        tenantLoading={false}
        tenantOptions={[]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders and forwards selection changes", async () => {
    const user = userEvent.setup();

    render(
      <TenantSwitcher
        allTenantsValue="all"
        canSwitchTenant
        onTenantChangeAction={onTenantChangeAction}
        selectedTenantId="all"
        tenantLoading={false}
        tenantOptions={[{ id: 1, name: "ACME" }]}
      />
    );

    expect(screen.getByText(/Default Tenant/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Tenant select/i }));

    expect(onTenantChangeAction).toHaveBeenCalledWith("all");
  });
});

