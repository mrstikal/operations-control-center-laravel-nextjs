// HR03 – Shifts – list a základní zobrazení

const shifts = [
  { id: 1, name: "Morning Shift", start_time: "06:00", end_time: "14:00", days_of_week: [1, 2, 3, 4, 5], description: "Early morning operations" },
  { id: 2, name: "Night Shift", start_time: "22:00", end_time: "06:00", days_of_week: [1, 2, 3, 4, 5, 6, 7], description: "Overnight coverage" },
  { id: 3, name: "Weekend Shift", start_time: "08:00", end_time: "16:00", days_of_week: [6, 7], description: "Weekend operations" },
];

describe("Shifts page", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });

    cy.intercept("GET", "**/api/shifts*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: shifts },
    }).as("getShifts");
  });

  it("HR03 – renders shifts list with name and time info", () => {
    cy.visitAuthenticated("/shifts");
    cy.wait("@getMe");
    cy.wait("@getShifts");

    cy.contains("h1", "Shifts Management").should("be.visible");
    cy.contains("Morning Shift").should("be.visible");
    cy.contains("Night Shift").should("be.visible");
    cy.contains("Weekend Shift").should("be.visible");
  });

  it("HR03b – shows New Shift button for user with manage_shifts permission", () => {
    cy.visitAuthenticated("/shifts");
    cy.wait("@getMe");
    cy.wait("@getShifts");

    // roleLevel 4 should have canManageShifts = true based on hook logic
    cy.contains("button", "+ New Shift").should("be.visible");
  });

  it("HR03c – creates a new shift via the modal", () => {
    cy.intercept("POST", "**/api/shifts", {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: {
        success: true,
        message: "Shift created",
        data: { id: 4, name: "Evening Shift", start_time: "14:00", end_time: "22:00", days_of_week: [1, 2, 3, 4, 5] },
      },
    }).as("createShift");

    cy.visitAuthenticated("/shifts");
    cy.wait("@getMe");
    cy.wait("@getShifts");

    cy.contains("button", "+ New Shift").click();

    // Fill in the shift form
    cy.get('input[placeholder="e.g., Morning Shift"]').type("Evening Shift");
    cy.get('input[type="time"]').eq(0).clear().type("14:00");
    cy.get('input[type="time"]').eq(1).clear().type("22:00");
    cy.contains("label", "Monday").find('input[type="checkbox"]').check({ force: true });

    cy.contains("button", /save|create/i).click({ force: true });
    cy.wait("@createShift");
  });
});

