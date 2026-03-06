// T01 – List tenantů – viditelný pouze superadminovi
// T02 – Vytvoření nového tenantu (modal)

const tenants = [
  { id: 1, name: "ACME Operations", description: "Primary tenant", status: "active", deleted_at: null, created_at: "2025-01-01T00:00:00Z" },
  { id: 2, name: "Beta Corp", description: "Second tenant", status: "active", deleted_at: null, created_at: "2025-06-01T00:00:00Z" },
  { id: 3, name: "Archived Co", description: "Old tenant", status: "inactive", deleted_at: "2026-01-01T00:00:00Z", created_at: "2024-01-01T00:00:00Z" },
];

const tenantsBody = {
  success: true,
  message: "",
  data: tenants,
  pagination: { total: 3, per_page: 15, current_page: 1, last_page: 1 },
};

describe("Tenants page", () => {
  describe("T01 – access control", () => {
    it("superadmin can access and see tenant list", () => {
      cy.mockSuperadminSession();

      cy.intercept("GET", "**/api/tenants/manage*", {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: tenantsBody,
      }).as("getTenants");

      cy.visitAuthenticated("/tenants");
      cy.wait("@getMe");
      cy.wait("@getTenants");

      cy.contains("ACME Operations").should("be.visible");
      cy.contains("Beta Corp").should("be.visible");
      cy.contains("Archived Co").should("be.visible");
    });

    it("regular admin sees access denied or redirect (no Tenants nav link)", () => {
      cy.mockAuthenticatedSession({ roleLevel: 4 });

      cy.visitAuthenticated("/dashboard");
      cy.wait("@getMe");

      // Tenants link should not be visible for non-superadmin
      cy.contains("a", "Tenants").should("not.exist");
    });
  });

  describe("T02 – create new tenant (superadmin)", () => {
    it("creates a new tenant via the modal form", () => {
      cy.mockSuperadminSession();

      cy.intercept("GET", "**/api/tenants/manage*", {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: tenantsBody,
      }).as("getTenants");

      cy.intercept("POST", "**/api/tenants/manage*", {
        statusCode: 201,
        headers: { "content-type": "application/json" },
        body: {
          success: true,
          message: "Tenant created",
          data: { id: 4, name: "New Tenant LLC", description: "Fresh start", status: "active", deleted_at: null },
        },
      }).as("createTenant");

      cy.visitAuthenticated("/tenants");
      cy.wait("@getMe");
      cy.wait("@getTenants");

      cy.contains("button", /\+ new tenant|add tenant|create tenant/i).click({ force: true });

      // Fill the form
      cy.contains("label", "Name").parent().find("input").type("New Tenant LLC");
      cy.contains("label", "Description").parent().find("textarea").type("Fresh start");

      cy.contains("button", "Create Tenant").click({ force: true });
      cy.wait("@createTenant");
    });
  });
});

