// C01 – Vytvoření kontraktu – úspěšný submit
// C02 – Vytvoření kontraktu – permission denied

describe("Create Contract page", () => {
  const meWithPermission = {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: {
      success: true,
      message: "",
      data: {
        id: 1,
        name: "E2E Admin",
        email: "admin@test.local",
        tenant_id: 1,
        tenant: { id: 1, name: "ACME Operations", deleted_at: null },
        tenant_archived: false,
        can_filter_by_tenant: false,
        permissions: [
          { resource: "contracts", action: "create" },
          { resource: "contracts", action: "view" },
        ],
        roles: [{ id: 1, name: "Admin", level: 4, description: "E2E role" }],
      },
    },
  };

  const meWithoutPermission = {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: {
      success: true,
      message: "",
      data: {
        id: 2,
        name: "E2E Viewer",
        email: "viewer@test.local",
        tenant_id: 1,
        tenant: { id: 1, name: "ACME Operations", deleted_at: null },
        tenant_archived: false,
        can_filter_by_tenant: false,
        permissions: [],
        roles: [{ id: 2, name: "Viewer", level: 1, description: "E2E viewer" }],
      },
    },
  };

  it("C01 – fills and submits the create contract form successfully", () => {
    cy.intercept("GET", "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });
    cy.intercept("POST", "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });
    cy.setCookie("laravel_session", "e2e-session");

    cy.intercept("GET", "**/api/me", meWithPermission).as("getMe");
    cy.intercept("GET", "**/api/notifications/unread-count", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: { count: 0 } } });
    cy.intercept("GET", "**/api/tenants*", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: [], pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 } } });
    cy.intercept("GET", "**/api/metadata/hr", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: { departments: [], availability_statuses: [], time_off_types: [], time_off_statuses: [] } } });

    cy.intercept("POST", "**/api/contracts", {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: {
        success: true,
        message: "Contract created",
        data: { id: 77 },
      },
    }).as("createContract");

    cy.intercept("GET", "**/api/contracts/77", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: {
        success: true,
        message: "",
        data: { id: 77, contract_number: "CTR-0077", title: "Annual Support 2026", status: "draft", priority: "medium", deleted_at: null },
      },
    });

    cy.visitAuthenticated("/contracts/create");
    cy.wait("@getMe");

    cy.contains("h1", /create new contract/i).should("be.visible");

    cy.contains("label", "Title").find("input").type("Annual Support 2026");
    cy.contains("label", "Contract Number").find("input").type("CTR-0077");
    cy.contains("label", "Priority").parent().find("input").first().click().clear().type("Medium");
    cy.contains("li", "Medium").click();

    cy.contains("button", /create contract/i).click();
    cy.wait("@createContract");

    cy.location("pathname").should("eq", "/contracts/77");
  });

  it("C02 – shows permission denied message for users without create permission", () => {
    cy.intercept("GET", "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });
    cy.setCookie("laravel_session", "e2e-session");

    cy.intercept("GET", "**/api/me", meWithoutPermission).as("getMe");
    cy.intercept("GET", "**/api/notifications/unread-count", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: { count: 0 } } });
    cy.intercept("GET", "**/api/tenants*", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: [], pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 } } });
    cy.intercept("GET", "**/api/metadata/hr", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: { departments: [], availability_statuses: [], time_off_types: [], time_off_statuses: [] } } });

    cy.visitAuthenticated("/contracts/create");
    cy.wait("@getMe");

    cy.contains(/do not have permission to create contracts/i).should("be.visible");
    cy.contains("button", /back/i).should("be.visible");
  });
});

