// AS01 – List assetů – zobrazení, stránkování, vyhledávání

type AssetRow = {
  id: number;
  asset_tag: string;
  name: string;
  status: "operational" | "maintenance" | "repair" | "retired" | "disposed";
  location: string;
  deleted_at: string | null;
  category: { id: number; name: string } | null;
  tenant: { id: number; name: string } | null;
};

const assets: AssetRow[] = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1,
  asset_tag: `AST-${String(index + 1).padStart(4, "0")}`,
  name: index === 10 ? "Deleted Asset" : `Asset ${index + 1}`,
  status:
    index % 4 === 0
      ? "maintenance"
      : index % 4 === 1
        ? "repair"
        : index % 4 === 2
          ? "retired"
          : "operational",
  location: `Location ${(index % 3) + 1}`,
  deleted_at: index === 10 ? "2026-03-01T10:00:00Z" : null,
  category: { id: 1, name: "IT Equipment" },
  tenant: null,
}));

function filterAssets(query: Record<string, string | number | boolean | string[] | undefined>) {
  const search = String(query.search ?? "").toLowerCase();
  const page = Number(query.page ?? 1);
  const perPage = Number(query.per_page ?? 15);

  let filtered = assets.filter((asset) => {
    if (!search) return true;
    return `${asset.name} ${asset.asset_tag}`.toLowerCase().includes(search);
  });

  filtered = filtered.sort((a, b) => b.id - a.id);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const data = filtered.slice(start, start + perPage);

  return {
    success: true,
    message: "",
    data,
    pagination: { total, per_page: perPage, current_page: page, last_page: lastPage },
  };
}

describe("Assets page", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });

    cy.intercept("GET", "**/api/asset-categories*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: {
        success: true,
        message: "",
        data: [{ id: 1, name: "IT Equipment" }, { id: 2, name: "Machinery" }],
      },
    }).as("getCategories");

    cy.intercept("GET", "**/api/assets*", (request) => {
      if (request.query.search) {
        request.alias = "searchAssets";
      } else if (String(request.query.page ?? "1") === "2") {
        request.alias = "assetsPage2";
      } else {
        request.alias = "getAssets";
      }

      request.reply({
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: filterAssets(request.query),
      });
    }).as("getAssets");
  });

  it("AS01 – renders asset list, paginates and searches", () => {
    cy.visitAuthenticated("/assets");

    cy.wait("@getMe");
    cy.wait("@getAssets");

    cy.contains("h1", "Assets").should("be.visible");
    cy.contains("h1", "Assets").should("be.visible");
    cy.contains("Asset 16").should("be.visible");
    cy.contains("Deleted Asset").should("be.visible");
    cy.contains("Total 16 · Page 1 of 2").should("be.visible");

    // Pagination
    cy.contains("button", "Next").click();
    cy.wait("@assetsPage2").its("request.url").should("contain", "page=2");
    cy.contains("Asset 16").should("not.exist");
    cy.contains("Asset 1").should("be.visible");
    cy.contains("Total 16 · Page 2 of 2").should("be.visible");

    // Search
    cy.get('input[placeholder="Name, tag or description..."]').clear().type("Deleted");
    cy.wait(400);
    cy.wait("@searchAssets").its("request.url").should("contain", "search=");
    cy.contains("Total 1 · Page 1 of 1").should("be.visible");
    cy.contains("Deleted Asset").should("be.visible");
  });

  it("AS01b – hides New Asset button for Viewer role", () => {
    cy.mockAuthenticatedSession({ roleLevel: 1 });

    cy.intercept("GET", "**/api/assets*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: filterAssets({}),
    }).as("getAssetsViewer");

    cy.visitAuthenticated("/assets");
    cy.wait("@getMe");
    cy.wait("@getAssetsViewer");

    cy.contains("h1", "Assets").should("be.visible");
    cy.contains("button", "+ New Asset").should("not.exist");
  });
});

