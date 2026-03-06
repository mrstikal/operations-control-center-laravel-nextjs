// AS02 – Vytvoření assetu – úspěšný submit
// AS02b – Vytvoření assetu – pokud uživatel nemá kategorii, vidí error

describe("Create Asset page", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });

    cy.intercept("GET", "**/api/asset-categories*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: {
        success: true,
        message: "",
        data: [
          { id: 1, name: "IT Equipment" },
          { id: 2, name: "Machinery" },
        ],
      },
    }).as("getCategories");

    cy.intercept("POST", "**/api/assets", {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: {
        success: true,
        message: "Asset created",
        data: {
          id: 99,
          asset_tag: "AST-9999",
          name: "New Test Asset",
          status: "operational",
          location: "Server Room",
          deleted_at: null,
          category: { id: 1, name: "IT Equipment" },
          tenant: null,
        },
      },
    }).as("createAsset");

    cy.intercept("GET", "**/api/assets/99", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: {
        success: true,
        message: "",
        data: {
          id: 99,
          asset_tag: "AST-9999",
          name: "New Test Asset",
          status: "operational",
          location: "Server Room",
          deleted_at: null,
          category: { id: 1, name: "IT Equipment" },
          tenant: null,
        },
      },
    }).as("getAssetDetail");
  });

  it("AS02 – fills and submits the create asset form successfully", () => {
    cy.visitAuthenticated("/assets/create");
    cy.wait("@getMe");
    cy.wait("@getCategories");

    cy.contains("h1", /create/i).should("be.visible");

    cy.contains("label", "Name").find("input").type("New Test Asset");
    cy.contains("label", "Asset Tag").find("input").type("AST-9999");
    cy.contains("label", "Location").find("input").type("Server Room");

    // FormBuilder uses SearchableSelect for select fields
    cy.contains("label", "Category").parent().find("input").first().click().clear().type("IT Equipment");
    cy.contains("li", "IT Equipment").click();

    cy.contains("button", /create asset/i).click();
    cy.wait("@createAsset");

    cy.location("pathname").should("eq", "/assets/99");
  });
});

