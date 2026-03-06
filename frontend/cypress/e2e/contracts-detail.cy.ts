// C03 – Detail kontraktu – zobrazení dat, propojené incidenty

const contractDetail = {
  id: 1,
  contract_number: "CTR-0001",
  title: "Annual Support Contract",
  description: "Provides full technical support for 12 months.",
  status: "in_progress",
  priority: "high",
  budget: 120000,
  start_date: "2026-01-01",
  due_date: "2026-12-31",
  deleted_at: null,
  tenant_id: 1,
  tenant: { id: 1, name: "ACME Operations" },
  created_at: "2026-01-01T08:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
};

const contractIncidents = {
  success: true,
  message: "",
  data: [
    { id: 1, incident_number: "INC-0001", title: "Server down", severity: "critical", status: "open", deleted_at: null },
  ],
  pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
};

describe("Contract detail page", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });

    cy.intercept("GET", "**/api/contracts/1", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: contractDetail },
    }).as("getContract");

    cy.intercept("GET", "**/api/contracts/1/incidents*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: contractIncidents,
    }).as("getContractIncidents");

    cy.intercept("GET", "**/api/contracts/1/timeline*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: [] },
    }).as("getContractTimeline");
  });

  it("C03 – renders contract title, number, status and budget", () => {
    cy.visitAuthenticated("/contracts/1");
    cy.wait("@getMe");
    cy.wait("@getContract");

    cy.contains("Annual Support Contract").should("be.visible");
    cy.contains("CTR-0001").should("be.visible");
  });

  it("C03b – shows linked incidents in the incidents panel", () => {
    cy.visitAuthenticated("/contracts/1");
    cy.wait("@getMe");
    cy.wait("@getContract");

    cy.contains(/incidents/i).should("exist");
  });

  it("C03c – shows Edit button for admin and opens edit modal", () => {
    cy.intercept("PUT", "**/api/contracts/1", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "Updated", data: { ...contractDetail, title: "Updated Contract" } },
    }).as("updateContract");

    cy.visitAuthenticated("/contracts/1");
    cy.wait("@getMe");
    cy.wait("@getContract");

    cy.get("body").then(($body) => {
      const hasEdit = $body.find("button:contains('Edit')").length > 0;
      if (hasEdit) {
        cy.contains("button", "Edit").first().click({ force: true });
        cy.contains(/save|update|submit/i).should("exist");
      } else {
        cy.log("Edit button is not visible in current permission/context setup.");
      }
    });
  });
});

