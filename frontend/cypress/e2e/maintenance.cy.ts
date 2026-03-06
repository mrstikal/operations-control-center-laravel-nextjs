// M01 – Záložka Logs – zobrazení, stránkování
// M02 – Záložka Schedules – state badge (ok / due_soon / overdue)
// M03 – Přepínání záložek Logs ↔ Schedules

const maintenanceLogs = {
  success: true,
  message: "",
  data: [
    { id: 1, asset_id: 1, type: "preventive", performed_at: "2026-02-01T10:00:00Z", description: "Routine check completed successfully", performed_by: 1, performed_by_user: { id: 1, name: "Technician A" }, asset: { id: 1, name: "Dell Server" } },
    { id: 2, asset_id: 2, type: "corrective", performed_at: "2026-02-15T14:00:00Z", description: "Replaced faulty HDD", performed_by: 2, performed_by_user: { id: 2, name: "Technician B" }, asset: { id: 2, name: "Storage Array" } },
  ],
  pagination: { total: 2, per_page: 20, current_page: 1, last_page: 1 },
};

const maintenanceSchedules = {
  success: true,
  message: "",
  data: [
    { id: 1, asset_id: 1, frequency: "quarterly", due_state: "ok", description: "Quarterly Inspection", next_due_at: "2026-05-01T00:00:00Z", asset: { id: 1, name: "Dell Server" } },
    { id: 2, asset_id: 2, frequency: "monthly", due_state: "due_soon", description: "Monthly Backup Check", next_due_at: "2026-03-15T00:00:00Z", asset: { id: 2, name: "Storage Array" } },
    { id: 3, asset_id: 3, frequency: "yearly", due_state: "overdue", description: "Annual Hardware Audit", next_due_at: "2026-01-01T00:00:00Z", asset: { id: 3, name: "Network Switch" } },
  ],
  pagination: { total: 3, per_page: 20, current_page: 1, last_page: 1 },
};

const assetOptions = {
  success: true,
  message: "",
  data: [
    { id: 1, name: "Dell Server", asset_tag: "AST-0001", status: "operational", deleted_at: null },
    { id: 2, name: "Storage Array", asset_tag: "AST-0002", status: "operational", deleted_at: null },
    { id: 3, name: "Network Switch", asset_tag: "AST-0003", status: "operational", deleted_at: null },
  ],
  pagination: { total: 3, per_page: 500, current_page: 1, last_page: 1 },
};

describe("Maintenance overview page", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });

    cy.intercept("GET", "**/api/assets*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: assetOptions,
    }).as("getAssets");

    cy.intercept("GET", "**/api/maintenance-logs*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: maintenanceLogs,
    }).as("getMaintenanceLogs");

    cy.intercept("GET", "**/api/maintenance-schedules*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: maintenanceSchedules,
    }).as("getMaintenanceSchedules");
  });

  it("M01 – default tab is Logs and shows log entries", () => {
    cy.visitAuthenticated("/maintenance");
    cy.wait("@getMe");
    cy.wait("@getMaintenanceLogs");

    cy.contains("Routine check completed successfully").should("be.visible");
    cy.contains("Replaced faulty HDD").should("be.visible");
    cy.contains("Technician A").should("be.visible");
  });

  it("M02 – Schedules tab shows entries with state badges", () => {
    cy.visitAuthenticated("/maintenance");
    cy.wait("@getMe");
    cy.wait("@getMaintenanceLogs");

    // Switch to Schedules tab
    cy.contains("button", "Schedules").click();
    cy.wait("@getMaintenanceSchedules");

    cy.contains("Quarterly Inspection").should("be.visible");
    cy.contains("Monthly Backup Check").should("be.visible");
    cy.contains("Annual Hardware Audit").should("be.visible");

    // State badges
    cy.contains("ok").should("be.visible");
    cy.contains("due_soon").should("be.visible");
    cy.contains("overdue").should("be.visible");
  });

  it("M03 – switches between Logs and Schedules tabs", () => {
    cy.visitAuthenticated("/maintenance");
    cy.wait("@getMe");
    cy.wait("@getMaintenanceLogs");

    // Initially on Logs tab
    cy.contains("Routine check completed successfully").should("be.visible");

    // Switch to Schedules
    cy.contains("button", "Schedules").click();
    cy.wait("@getMaintenanceSchedules");
    cy.contains("Quarterly Inspection").should("be.visible");
    cy.contains("Routine check completed successfully").should("not.exist");

    // Switch back to Logs
    cy.contains("button", "Logs").click();
    cy.contains("Routine check completed successfully").should("be.visible");
    cy.contains("Quarterly Inspection").should("not.exist");
  });
});

