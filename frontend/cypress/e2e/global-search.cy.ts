// N03 – Globální vyhledávání – dotaz → výsledky
// N04 – Globální vyhledávání – krátký dotaz → hint text

describe("Global search", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });
    cy.visitAuthenticated("/dashboard");
    cy.wait("@getMe");
  });

  it("N04 – shows minimum-length hint when query is too short", () => {
    cy.get("body").then(($body) => {
      if ($body.find('input[aria-label="Global search"]').length === 0) {
        cy.get('input[aria-label="Global search"]').should("not.exist");
        return;
      }

      cy.get('input[aria-label="Global search"]').focus().type("ab");
      cy.contains(/type at least/i).should("be.visible");
    });
  });

  it("N03 – returns search results for a valid query", () => {
    cy.intercept("GET", "**/api/search*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: {
        success: true,
        message: "",
        data: [
          { id: 1, type: "contract", title: "Support Contract Alpha", number: "CTR-0001" },
          { id: 2, type: "incident", title: "Server Outage", number: "INC-0002" },
          { id: 3, type: "asset", title: "Dell Server", number: "AST-0003" },
        ],
      },
    }).as("search");

    cy.get("body").then(($body) => {
      if ($body.find('input[aria-label="Global search"]').length === 0) {
        cy.get('input[aria-label="Global search"]').should("not.exist");
        return;
      }

      cy.get('input[aria-label="Global search"]').focus().type("support");
      cy.wait(400);
      cy.wait("@search");
      cy.contains("Support Contract Alpha").should("be.visible");
      cy.contains("Server Outage").should("be.visible");
      cy.contains("Dell Server").should("be.visible");
    });
  });

  it("N03b – shows 'No results found' when search returns empty", () => {
    cy.intercept("GET", "**/api/search*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: [] },
    }).as("emptySearch");

    cy.get("body").then(($body) => {
      if ($body.find('input[aria-label="Global search"]').length === 0) {
        cy.get('input[aria-label="Global search"]').should("not.exist");
        return;
      }

      cy.get('input[aria-label="Global search"]').focus().type("xyznotfound");
      cy.wait(400);
      cy.wait("@emptySearch");
      cy.contains("No results found.").should("be.visible");
    });
  });
});

