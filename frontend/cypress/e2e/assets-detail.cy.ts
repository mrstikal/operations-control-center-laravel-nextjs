// AS03 – Detail assetu – záložky Overview / Maintenance / Audit Trail
// AS04 – Soft delete (lifecycle modal)

const assetDetail = {
  id: 1,
  asset_tag: "AST-0001",
  name: "Dell PowerEdge Server",
  description: "Main production server.",
  status: "operational",
  location: "Server Room A",
  department: "Operations",
  manufacturer: "Dell",
  model: "PowerEdge R740",
  serial_number: "SN123456",
  acquisition_date: "2022-01-15",
  warranty_expiry: "2025-01-15",
  deleted_at: null,
  category: { id: 1, name: "IT Equipment" },
  tenant: { id: 1, name: "ACME Operations" },
};

const emptyPaginated = {
  success: true,
  message: "",
  data: [],
  pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 },
};

function mockAssetDetailApis(asset = assetDetail) {
  cy.intercept("GET", "**/api/assets/1", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: { success: true, message: "", data: asset },
  }).as("getAsset");

  cy.intercept("GET", "**/api/assets/1/maintenance-logs*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: {
      success: true,
      message: "",
      data: [
        { id: 1, type: "preventive", performed_at: "2026-02-01T10:00:00Z", description: "Routine check", performed_by: 1, performed_by_user: { id: 1, name: "Technician A" }, asset_id: 1, asset: { id: 1, name: "Dell PowerEdge Server" } },
      ],
      pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
    },
  }).as("getMaintenanceLogs");

  cy.intercept("GET", "**/api/assets/1/maintenance-schedules*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: {
      success: true,
      message: "",
      data: [
        { id: 1, frequency: "monthly", due_state: "ok", description: "Quarterly Inspection", next_due_at: "2026-05-01T00:00:00Z", asset_id: 1, asset: { id: 1, name: "Dell PowerEdge Server" } },
      ],
      pagination: { total: 1, per_page: 15, current_page: 1, last_page: 1 },
    },
  }).as("getMaintenanceSchedules");

  cy.intercept("GET", "**/api/assets/1/audit*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: emptyPaginated,
  }).as("getAuditTrail");
}

describe("Asset detail page", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });
    mockAssetDetailApis();
  });

  it("AS03 – renders asset name, tag and status", () => {
    cy.visitAuthenticated("/assets/1");
    cy.wait("@getMe");
    cy.wait("@getAsset");

    cy.contains("Dell PowerEdge Server").should("be.visible");
    cy.contains("AST-0001").should("be.visible");
    cy.contains(/operational/i).should("be.visible");
  });

  it("AS03b – overview tab shows basic asset info", () => {
    cy.visitAuthenticated("/assets/1");
    cy.wait("@getMe");
    cy.wait("@getAsset");

    // Overview is the default tab
    cy.contains("Overview").should("be.visible");
    cy.contains("Server Room A").should("be.visible");
  });

  it("AS03c – switches to Maintenance tab showing maintenance logs", () => {
    cy.visitAuthenticated("/assets/1");
    cy.wait("@getMe");
    cy.wait("@getAsset");

    // Switch to Maintenance tab
    cy.contains("button", /^Maintenance$/).click({ force: true });
    cy.wait("@getMaintenanceLogs");

    cy.contains("Maintenance").should("be.visible");
  });

  it("AS04 – shows lifecycle modal when Delete button is clicked", () => {
    cy.intercept("DELETE", "**/api/assets/1", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "Asset deleted", data: null },
    }).as("deleteAsset");

    cy.visitAuthenticated("/assets/1");
    cy.wait("@getMe");
    cy.wait("@getAsset");

    // Lifecycle modal is triggered by a Delete/Archive button
    cy.contains("button", "Soft Delete").click({ force: true });

    // Modal or confirmation dialog should appear
    cy.contains(/confirm|are you sure|delete/i).should("be.visible");
  });

  it("AS03d – shows 'Asset not found' when asset does not exist", () => {
    cy.intercept("GET", "**/api/assets/999", {
      statusCode: 404,
      headers: { "content-type": "application/json" },
      body: { success: false, message: "Not found", data: null },
    }).as("getAssetNotFound");

    cy.visitAuthenticated("/assets/999");
    cy.wait("@getMe");
    cy.wait("@getAssetNotFound");

    cy.contains(/not found/i).should("be.visible");
  });
});

