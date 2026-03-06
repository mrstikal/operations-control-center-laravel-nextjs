type ContractRow = {
  id: number;
  contract_number: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "draft" | "approved" | "in_progress" | "blocked" | "done";
  incidents_count: number;
  due_date: string | null;
  budget: number;
  deleted_at: string | null;
};

const contracts: ContractRow[] = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1,
  contract_number: `CTR-${String(index + 1).padStart(4, "0")}`,
  title: index === 10 ? "Archived Contract" : `Contract ${index + 1}`,
  priority:
    index % 4 === 0 ? "critical" : index % 4 === 1 ? "high" : index % 4 === 2 ? "medium" : "low",
  status: index % 2 === 0 ? "in_progress" : "approved",
  incidents_count: index % 3,
  due_date: "2026-04-01",
  budget: 100000 + index * 5000,
  deleted_at: index === 10 ? "2026-03-01T10:00:00Z" : null,
}));

function filterContracts(query: Record<string, string | number | boolean | string[] | undefined>) {
  const search = String(query.search ?? "").toLowerCase();
  const status = String(query.status ?? "");
  const page = Number(query.page ?? 1);
  const perPage = Number(query.per_page ?? 15);

  let filtered = contracts.filter((contract) => {
    if (search) {
      const haystack = `${contract.title} ${contract.contract_number}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (status === "deleted") {
      return Boolean(contract.deleted_at);
    }

    if (status) {
      return contract.status === status;
    }

    return true;
  });

  filtered = filtered.sort((left, right) => right.id - left.id);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const data = filtered.slice(start, start + perPage);

  return {
    success: true,
    message: "",
    data,
    pagination: {
      total,
      per_page: perPage,
      current_page: page,
      last_page: lastPage,
    },
  };
}

describe("Contracts page", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });
    cy.intercept("GET", "**/api/contracts*", (request) => {
      if (request.query.search) {
        request.alias = "searchContracts";
      } else if (String(request.query.page ?? "1") === "2") {
        request.alias = "contractsPage2";
      } else {
        request.alias = "getContracts";
      }

      request.reply({
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: filterContracts(request.query),
      });
    }).as("getContracts");
  });

  it("renders contracts list, paginates and filters deleted contracts", () => {
    cy.visitAuthenticated("/contracts");

    cy.wait("@getMe");
    cy.wait("@getContracts");

    cy.contains("h1", "Contracts").should("be.visible");
    cy.contains("Contract 16").should("be.visible");
    cy.contains("Archived Contract").should("be.visible");
    cy.contains("Total 16 · Page 1 of 2").should("be.visible");

    cy.contains("button", "Next").click();
    cy.wait("@contractsPage2").its("request.url").should("contain", "page=2");
    cy.contains("Contract 16").should("not.exist");
    cy.contains("Contract 1").should("be.visible");
    cy.contains("Total 16 · Page 2 of 2").should("be.visible");

    cy.get('input[placeholder="Title or description..."]').clear().type("Archived");
    cy.wait(400);
    cy.wait("@searchContracts").its("request.url").should("contain", "search=Archived");

    cy.contains("Total 1 · Page 1 of 1").should("be.visible");
    cy.contains("tr", "Archived Contract").within(() => {
      cy.contains("Deleted").should("be.visible");
      cy.contains("button", "Details").should("be.visible");
    });
  });
});

