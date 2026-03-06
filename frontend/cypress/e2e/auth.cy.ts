describe("Authentication flows", () => {
  it("redirects authenticated users from /login to /dashboard", () => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });

    cy.visit("/login");

    cy.location("pathname").should("eq", "/dashboard");
  });

  it("redirects unauthenticated users from /employees to /login", () => {
    cy.clearCookie("laravel_session");
    cy.clearLocalStorage();

    cy.visit("/employees");

    cy.location("pathname").should("eq", "/login");
    cy.location("search").should("contain", "from=%2Femployees");
  });

  it("stays on the login page when login fails", () => {
    cy.intercept("POST", "**/api/login", {
      statusCode: 401,
      headers: { "content-type": "application/json" },
      body: {
        success: false,
        message: "Invalid credentials",
        data: null,
      },
    }).as("login");

    cy.visit("/login");
    cy.get('input[type="email"]').clear().type("user@test.local");
    cy.get('input[type="password"]').clear().type("wrong-password");
    cy.contains("button", "Login").click();

    cy.wait("@login");
    cy.location("pathname").should("eq", "/login");
    cy.contains("button", "Login").should("be.visible").and("not.be.disabled");
  });
});

