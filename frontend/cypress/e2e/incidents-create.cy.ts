// I01 – Vytvoření incidentu – úspěšný submit
// I02 – Vytvoření incidentu – permission denied UI

describe("Create Incident page", () => {
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
          { resource: "incidents", action: "create" },
          { resource: "incidents", action: "view" },
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

  it("I01 – fills and submits the create incident form successfully", () => {
    // Setup – intercept /api/me with create permission
    cy.intercept("GET", "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });
    cy.intercept("POST", "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });
    cy.setCookie("laravel_session", "e2e-session");

    cy.intercept("GET", "**/api/me", meWithPermission).as("getMe");
    cy.intercept("GET", "**/api/notifications/unread-count", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: { count: 0 } } });
    cy.intercept("GET", "**/api/tenants*", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: [], pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 } } });
    cy.intercept("GET", "**/api/metadata/hr", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: { departments: [], availability_statuses: [], time_off_types: [], time_off_statuses: [] } } });

    cy.intercept("POST", "**/api/incidents", {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: {
        success: true,
        message: "Incident created",
        data: { id: 55 },
      },
    }).as("createIncident");

    cy.intercept("GET", "**/api/incidents/55", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: {
        success: true,
        message: "",
        data: { id: 55, incident_number: "INC-0055", title: "DB Connection Error", severity: "high", status: "open", deleted_at: null },
      },
    }).as("getIncidentDetail");

    cy.visitAuthenticated("/incidents/create");
    cy.wait("@getMe");

    cy.contains("h1", /create/i).should("be.visible");

    // Fill in the form
    cy.get('input[placeholder="Brief incident title"]').type("DB Connection Error");
    cy.get('textarea[placeholder="Detailed description of the incident"]').type("Database is unreachable from app server.");

    cy.contains("button", /create incident/i).click();
    cy.wait("@createIncident");

    cy.location("pathname").should("eq", "/incidents/55");
  });

  it("I02 – shows permission denied message for users without create permission", () => {
    cy.intercept("GET", "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });
    cy.setCookie("laravel_session", "e2e-session");

    cy.intercept("GET", "**/api/me", meWithoutPermission).as("getMe");
    cy.intercept("GET", "**/api/notifications/unread-count", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: { count: 0 } } });
    cy.intercept("GET", "**/api/tenants*", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: [], pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 } } });
    cy.intercept("GET", "**/api/metadata/hr", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: { departments: [], availability_statuses: [], time_off_types: [], time_off_statuses: [] } } });

    cy.visitAuthenticated("/incidents/create");
    cy.wait("@getMe");

    cy.contains(/don.*t have permission to create incidents/i).should("be.visible");
    cy.contains("button", /back/i).should("be.visible");
  });
});

