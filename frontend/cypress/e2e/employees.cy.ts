type EmployeeRow = {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
  phone: string;
  availability_status: "available" | "on_leave" | "on_maintenance" | "unavailable";
  deleted_at: string | null;
};

const employees: EmployeeRow[] = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1,
  name: index === 0 ? "Alice Johnson" : index === 10 ? "Deleted Employee" : `Employee ${index + 1}`,
  email:
    index === 0
      ? "alice@test.local"
      : index === 10
        ? "deleted@test.local"
        : `employee${index + 1}@test.local`,
  department: index % 2 === 0 ? "Operations" : "HR",
  position: index % 2 === 0 ? "Operator" : "Coordinator",
  phone: `+420 555 00${String(index + 1).padStart(2, "0")}`,
  availability_status: index % 3 === 0 ? "on_leave" : "available",
  deleted_at: index === 10 ? "2026-03-01T10:00:00Z" : null,
}));

function filterEmployees(query: Record<string, string | number | boolean | string[] | undefined>) {
  const search = String(query.search ?? "").toLowerCase();
  const department = String(query.department ?? "");
  const status = String(query.status ?? "");
  const page = Number(query.page ?? 1);
  const perPage = Number(query.per_page ?? 15);

  let filtered = employees.filter((employee) => {
    if (search) {
      const haystack = `${employee.name} ${employee.email}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    if (department && employee.department !== department) {
      return false;
    }

    if (status === "deleted") {
      return Boolean(employee.deleted_at);
    }

    if (status && employee.availability_status !== status) {
      return false;
    }

    return status !== "deleted" || Boolean(employee.deleted_at);
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

describe("Employees page", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });
    cy.intercept("GET", "**/api/employees*", (request) => {
      if (request.query.search) {
        request.alias = "searchEmployees";
      } else if (String(request.query.page ?? "1") === "2") {
        request.alias = "employeesPage2";
      } else {
        request.alias = "getEmployees";
      }

      request.reply({
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: filterEmployees(request.query),
      });
    }).as("getEmployees");
  });

  it("renders the list, paginates results and shows deleted-row actions after filtering", () => {
    cy.visitAuthenticated("/employees");

    cy.wait("@getMe");
    cy.wait("@getEmployees");

    cy.contains("h1", "Employees").should("be.visible");
    cy.contains("button", "+ Add Employee").should("be.visible");
    cy.contains("Employee 16").should("be.visible");
    cy.contains("Deleted Employee").should("be.visible");
    cy.contains("Total 16 · Page 1 of 2").should("be.visible");

    cy.contains("button", "Next").click();
    cy.wait("@employeesPage2").its("request.url").should("contain", "page=2");
    cy.contains("Employee 16").should("not.exist");
    cy.contains("Alice Johnson").should("be.visible");
    cy.contains("Total 16 · Page 2 of 2").should("be.visible");

    cy.get('input[placeholder="Name or email..."]').clear().type("Deleted");
    cy.wait(400);
    cy.wait("@searchEmployees").its("request.url").should("contain", "search=Deleted");

    cy.contains("Total 1 · Page 1 of 1").should("be.visible");
    cy.contains("tr", "Deleted Employee").within(() => {
      cy.contains("button", /^Restore$/).should("be.visible");
      cy.contains("button", /^Hard Delete$/).should("be.visible");
      cy.contains("button", /^Edit$/).should("not.exist");
      cy.contains("button", /^Delete$/).should("not.exist");
    });
  });
});

