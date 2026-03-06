// N01 – Hlavní navigace: Dashboard / Contracts / Incidents / Assets / Maintenance
// N02 – HR dropdown: Employees / Departments / Shifts / Time-Off

describe("Main navigation", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });
    cy.visitAuthenticated("/dashboard");
    cy.wait("@getMe");
  });

  it("N01 – main nav links are visible and navigate correctly", () => {
    // All main nav items should be in the header
    cy.contains("a", "Dashboard").should("be.visible");
    cy.contains("a", "Contracts").should("be.visible");
    cy.contains("a", "Incidents").should("be.visible");
    cy.contains("a", "Assets").should("be.visible");
    cy.contains("a", "Maintenance").should("be.visible");

    // Navigate to Incidents
    cy.intercept("GET", "**/api/incidents*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: [], pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 } },
    }).as("getIncidents");

    cy.contains("a", "Incidents").click();
    cy.location("pathname").should("eq", "/incidents");
    cy.wait("@getIncidents");
    cy.contains("h1", "Incidents").should("be.visible");
  });

  it("N01b – navigates to Contracts page", () => {
    cy.intercept("GET", "**/api/contracts*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: [], pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 } },
    }).as("getContracts");

    cy.contains("a", "Contracts").click();
    cy.location("pathname").should("eq", "/contracts");
    cy.wait("@getContracts");
    cy.contains("h1", "Contracts").should("be.visible");
  });

  it("N01c – navigates to Assets page", () => {
    cy.intercept("GET", "**/api/assets*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: [], pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 } },
    }).as("getAssets");
    cy.intercept("GET", "**/api/asset-categories*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: [] },
    });

    cy.contains("a", "Assets").click();
    cy.location("pathname").should("eq", "/assets");
    cy.wait("@getAssets");
    cy.contains("h1", "Assets").should("be.visible");
  });

  it("N02 – HR dropdown opens and contains sub-links", () => {
    // HR menu button should be visible
    cy.contains("button", "HR").should("be.visible").click();

    // Dropdown should appear with HR sub-items
    cy.contains("a", "Employees").should("be.visible");
    cy.contains("a", "Departments").should("be.visible");
    cy.contains("a", "Shifts").should("be.visible");
    cy.contains("a", "Time-Off").should("be.visible");
  });

  it("N02b – clicking Employees from HR menu navigates correctly", () => {
    cy.intercept("GET", "**/api/employees*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: [], pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 } },
    }).as("getEmployees");

    cy.contains("button", "HR").click();
    cy.contains("a", "Employees").click();
    cy.location("pathname").should("eq", "/employees");
    cy.wait("@getEmployees");
    cy.contains("h1", "Employees").should("be.visible");
  });
});

describe("Tenants link (superadmin only)", () => {
  it("shows Tenants nav link for superadmin", () => {
    cy.mockSuperadminSession();

    cy.intercept("GET", "**/api/tenants*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: [], pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 } },
    }).as("getTenants");

    cy.visitAuthenticated("/dashboard");
    cy.wait("@getMe");

    cy.contains("a", "Tenants").should("be.visible");
  });

  it("hides Tenants nav link for regular admin", () => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });
    cy.visitAuthenticated("/dashboard");
    cy.wait("@getMe");

    cy.contains("a", "Tenants").should("not.exist");
  });
});

