// HR01 – Departments list (admin i superadmin)
// HR02 – Vytvoření nového dept (superadmin)

const departments = [
  { id: 1, name: "Operations", description: "Operations team", is_active: true, employees_count: 10 },
  { id: 2, name: "HR", description: "Human Resources", is_active: true, employees_count: 5 },
  { id: 3, name: "Finance", description: "Finance department", is_active: false, employees_count: 3 },
];

describe("Departments page", () => {
  beforeEach(() => {
    // Route-specific intercepts must be registered after mockAuthenticatedSession in each context.
  });

  describe("HR01 – Admin can view departments", () => {
    beforeEach(() => {
      cy.mockAuthenticatedSession({ roleLevel: 4 });
      cy.intercept("GET", "**/api/departments*", {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: { success: true, message: "", data: departments },
      }).as("getDepartments");
    });

    it("renders departments list with name, description and employee count", () => {
      cy.visitAuthenticated("/departments");
      cy.wait("@getMe");
      cy.wait("@getDepartments");

      cy.contains("h1", "Departments").should("be.visible");
      cy.contains("Operations").should("be.visible");
      cy.contains("HR").should("be.visible");
      cy.contains("Finance").should("be.visible");
    });

    it("shows read-only notice for non-superadmin", () => {
      cy.visitAuthenticated("/departments");
      cy.wait("@getMe");
      cy.wait("@getDepartments");

      // Non-superadmin sees the informational notice
      cy.contains(/create, edit and delete are restricted to superadmin/i).should("be.visible");

      // Create button should NOT be visible for regular admin
      cy.contains("button", "+ New Department").should("not.exist");
    });
  });

  describe("HR02 – Superadmin can create a department", () => {
    beforeEach(() => {
      cy.mockSuperadminSession();
      cy.intercept("GET", "**/api/departments*", {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: { success: true, message: "", data: departments },
      }).as("getDepartments");
    });

    it("shows New Department button for superadmin", () => {
      cy.visitAuthenticated("/departments");
      cy.wait("@getMe");
      cy.wait("@getDepartments");

      cy.contains("button", "+ New Department").should("be.visible");
    });

    it("creates a new department via the modal", () => {
      cy.intercept("POST", "**/api/departments", {
        statusCode: 201,
        headers: { "content-type": "application/json" },
        body: { success: true, message: "Department created", data: { id: 4, name: "Engineering", description: "Engineering team", is_active: true, employees_count: 0 } },
      }).as("createDepartment");

      cy.visitAuthenticated("/departments");
      cy.wait("@getMe");
      cy.wait("@getDepartments");

      cy.contains("button", "+ New Department").click();

      // Modal should open
      cy.get('input[placeholder="Department name"]').type("Engineering");
      cy.get('input[placeholder="Optional"]').type("Engineering team");

      cy.contains("button", /save|create/i).click({ force: true });
      cy.wait("@createDepartment");
    });
  });
});

