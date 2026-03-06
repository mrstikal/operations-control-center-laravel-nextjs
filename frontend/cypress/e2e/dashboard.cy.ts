// D01 – KPI karty operačních metrik (Admin)
// D02 – Skrytí KPI karet pro Viewer
// D03 – Monitoring Alerts sekce
// D04 – Recent Contracts a Recent Incidents tabulky
// D05 / E01 – Chyba API → zobrazení chybové zprávy

const dashboardSummaryBody = {
  success: true,
  message: "",
  data: {
    kpi: {
      operational: {
        incidents_total: 42,
        incidents_open: 10,
        incidents_escalated: 3,
        incidents_sla_breached: 2,
        assets_total: 80,
        assets_operational: 70,
        assets_in_maintenance: 5,
        assets_overdue_maintenance: 3,
        avg_incident_resolution_h: 4.5,
        open_incidents_sla_compliance_pct: 88,
      },
      business: {
        contracts_total: 20,
        contracts_done: 8,
        contracts_active: 7,
        contracts_overdue: 2,
        contracts_blocked: 1,
        contracts_sla_breached: 1,
        total_budget: 1500000,
      },
    },
    monitoring: {
      overdue_maintenance: 3,
      api_errors_last_24h: { "4xx": 5, "5xx": 2, total: 7 },
      job_failures_last_24h: { maintenance: 1, total: 1 },
      alerts: [
        { code: "overdue_maintenance", severity: "warning", message: "Overdue maintenance tasks detected", value: 3 },
      ],
      scope_note: "tenant-wide",
    },
  },
};

const recentContractsBody = {
  success: true,
  message: "",
  data: [
    { id: 1, contract_number: "CTR-0001", title: "Support Contract A", status: "in_progress", priority: "high", due_date: "2026-05-01", budget: 50000, incidents_count: 2, deleted_at: null },
    { id: 2, contract_number: "CTR-0002", title: "Support Contract B", status: "approved", priority: "medium", due_date: "2026-06-01", budget: 30000, incidents_count: 0, deleted_at: null },
  ],
  pagination: { total: 2, per_page: 5, current_page: 1, last_page: 1 },
};

const recentIncidentsBody = {
  success: true,
  message: "",
  data: [
    { id: 1, incident_number: "INC-0001", title: "Server down", severity: "critical", status: "open", deleted_at: null },
    { id: 2, incident_number: "INC-0002", title: "Slow response", severity: "medium", status: "in_progress", deleted_at: null },
  ],
  pagination: { total: 2, per_page: 5, current_page: 1, last_page: 1 },
};

function mockDashboardApis() {
  cy.intercept("GET", "**/api/dashboard/summary*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: dashboardSummaryBody,
  }).as("getDashboardSummary");

  cy.intercept("GET", "**/api/contracts*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: recentContractsBody,
  }).as("getContracts");

  cy.intercept("GET", "**/api/incidents*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: recentIncidentsBody,
  }).as("getIncidents");

  cy.intercept("GET", "**/api/dashboard/feed*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: { success: true, message: "", data: [] },
  }).as("getDashboardFeed");

  cy.intercept("GET", "**/api/dashboard/read-models*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: { success: true, message: "", data: { projections: [], snapshots: [] }, pagination: { projections: { total: 0, per_page: 10, current_page: 1, last_page: 1 }, snapshots: { total: 0, per_page: 10, current_page: 1, last_page: 1 } } },
  }).as("getReadModels");
}

describe("Dashboard page", () => {
  describe("Admin (roleLevel 4)", () => {
    beforeEach(() => {
      cy.mockAuthenticatedSession({ roleLevel: 4 });
      mockDashboardApis();
    });

    it("D01 – renders Operational Metrics KPI cards for Admin", () => {
      cy.visitAuthenticated("/dashboard");
      cy.wait("@getMe");
      cy.wait("@getDashboardSummary");

      cy.contains("h2", "Operational Metrics").should("be.visible");
      cy.contains("Total contracts").should("be.visible");
      cy.contains("Total incidents").should("be.visible");
    });

    it("D03 – shows Monitoring Alerts section with alert items", () => {
      cy.visitAuthenticated("/dashboard");
      cy.wait("@getMe");
      cy.wait("@getDashboardSummary");

      cy.contains("h2", "Monitoring Alerts").should("be.visible");
      cy.contains("Overdue maintenance tasks detected").should("be.visible");
    });

    it("D04 – shows Recent Contracts and Recent Incidents tables", () => {
      cy.visitAuthenticated("/dashboard");
      cy.wait("@getMe");
      cy.wait("@getDashboardSummary");

      cy.contains("Support Contract A").should("be.visible");
      cy.contains("CTR-0001").should("be.visible");
      cy.contains("Server down").should("be.visible");
      cy.contains("INC-0001").should("be.visible");
    });
  });

  describe("Viewer (roleLevel 1)", () => {
    beforeEach(() => {
      cy.mockAuthenticatedSession({ roleLevel: 1 });
      mockDashboardApis();
    });

    it("D02 – hides Operational Metrics KPI cards for Viewer", () => {
      cy.visitAuthenticated("/dashboard");
      cy.wait("@getMe");
      cy.wait("@getDashboardSummary");

      cy.contains("h2", "Operational Metrics").should("not.exist");
      cy.contains("Total contracts").should("not.exist");
    });
  });

  describe("Error handling", () => {
    it("D05/E01 – shows error message when dashboard API returns 500", () => {
      cy.mockAuthenticatedSession({ roleLevel: 4 });

      cy.intercept("GET", "**/api/dashboard/summary*", {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: { success: false, message: "Internal Server Error", data: null },
      }).as("getDashboardSummaryError");

      cy.intercept("GET", "**/api/contracts*", {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: recentContractsBody,
      });
      cy.intercept("GET", "**/api/incidents*", {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: recentIncidentsBody,
      });
      cy.intercept("GET", "**/api/dashboard/feed*", {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: { success: true, message: "", data: [] },
      });
      cy.intercept("GET", "**/api/dashboard/read-models*", {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: { success: true, message: "", data: { projections: [], snapshots: [] }, pagination: { projections: { total: 0, per_page: 10, current_page: 1, last_page: 1 }, snapshots: { total: 0, per_page: 10, current_page: 1, last_page: 1 } } },
      });

      cy.visitAuthenticated("/dashboard");
      cy.wait("@getMe");
      cy.wait("@getDashboardSummaryError");

      // Either a generic error message or the loading spinner never goes away
      // The page shows an error card with red text
      cy.get(".text-red-400").should("exist");
    });
  });
});

