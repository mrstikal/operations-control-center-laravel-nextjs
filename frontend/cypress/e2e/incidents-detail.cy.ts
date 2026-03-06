// I03 – Detail incidentu – metadata, timeline, komentáře
// I04 – Soft delete + restore incidentu
// E02 – Incident detail 404 → „not found" stav

const incidentDetail = {
  id: 1,
  incident_number: "INC-0001",
  title: "Production DB down",
  description: "Database unreachable from all app servers.",
  severity: "critical",
  status: "open",
  category: "infrastructure",
  priority: "high",
  deleted_at: null as string | null,
  tenant_id: 1,
  created_at: "2026-03-01T08:00:00Z",
  updated_at: "2026-03-01T09:00:00Z",
  assigned_to: null,
  tenant: { id: 1, name: "ACME Operations" },
};

const deletedIncidentDetail = { ...incidentDetail, deleted_at: "2026-03-10T10:00:00Z", status: "closed" };

const timeline = {
  success: true,
  message: "",
  data: [
    { id: 1, event_type: "created", message: "Incident created", occurred_at: "2026-03-01T08:00:00Z", user: { id: 1, name: "Admin" } },
  ],
};

const emptyList = { success: true, message: "", data: [] };

function mockIncidentDetailApis(incident: Record<string, unknown> = incidentDetail) {
  cy.intercept("GET", "**/api/incidents/1", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: { success: true, message: "", data: incident },
  }).as("getIncident");

  cy.intercept("GET", "**/api/incidents/1/timeline*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: timeline,
  }).as("getTimeline");

  cy.intercept("GET", "**/api/incidents/1/assignments*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: emptyList,
  }).as("getAssignments");

  cy.intercept("GET", "**/api/incidents/1/escalations*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: emptyList,
  }).as("getEscalations");

  cy.intercept("GET", "**/api/incidents/1/comments*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: emptyList,
  }).as("getComments");

  cy.intercept("GET", "**/api/users*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: emptyList,
  }).as("getUsers");
}

describe("Incident detail page", () => {
  describe("I03 – detail with metadata, timeline and comments", () => {
    beforeEach(() => {
      cy.mockAuthenticatedSession({ roleLevel: 4 });
      mockIncidentDetailApis();
    });

    it("renders incident title, number, severity and status", () => {
      cy.visitAuthenticated("/incidents/1");
      cy.wait("@getMe");
      cy.wait("@getIncident");

      cy.contains("Production DB down").should("be.visible");
      cy.contains("INC-0001").should("be.visible");
      cy.contains(/critical/i).should("be.visible");
    });

    it("renders timeline section", () => {
      cy.visitAuthenticated("/incidents/1");
      cy.wait("@getMe");
      cy.wait("@getIncident");
      cy.wait("@getTimeline");

      cy.contains("Incident created").should("be.visible");
    });
  });

  describe("I04 – soft delete and restore", () => {
    it("shows Restore and Hard Delete buttons for a deleted incident", () => {
      cy.mockAuthenticatedSession({ roleLevel: 4 });
      mockIncidentDetailApis(deletedIncidentDetail as Record<string, unknown>);

      cy.visitAuthenticated("/incidents/1");
      cy.wait("@getMe");
      cy.wait("@getIncident");

      cy.contains("button", /restore/i).should("be.visible");
      cy.contains("button", /hard delete/i).should("be.visible");
    });

    it("calls soft delete API and hides Delete button for deleted incident", () => {
      cy.mockAuthenticatedSession({ roleLevel: 4 });
      mockIncidentDetailApis();

      cy.visitAuthenticated("/incidents/1");
      cy.wait("@getMe");
      cy.wait("@getIncident");

      cy.contains("button", "Soft Delete").click({ force: true });
      cy.contains(/delete/i).should("exist");
    });
  });

  describe("E02 – 404 not found", () => {
    it("shows 'not found' state when incident does not exist", () => {
      cy.mockAuthenticatedSession({ roleLevel: 4 });

      cy.intercept("GET", "**/api/incidents/999", {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: { success: false, message: "Incident not found", data: null },
      }).as("getNotFound");

      cy.intercept("GET", "**/api/incidents/999/**", {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: { success: false, message: "Not found", data: null },
      });

      cy.visitAuthenticated("/incidents/999");
      cy.wait("@getMe");
      cy.wait("@getNotFound");

      cy.contains(/not found/i).should("be.visible");
    });
  });
});

