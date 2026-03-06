// HR04 – Time-Off – list žádostí, přepínání filtru

const timeOffRequests = {
  success: true,
  message: "",
  data: [
    {
      id: 1,
      type: "vacation",
      status: "pending",
      start_date: "2026-04-01",
      end_date: "2026-04-05",
      reason: "Family vacation",
      employee: { id: 1, user: { id: 101, name: "Alice Johnson", email: "alice@test.local" }, department: "Operations", position: "Operator" },
      created_at: "2026-03-10T08:00:00Z",
    },
    {
      id: 2,
      type: "sick_leave",
      status: "approved",
      start_date: "2026-03-05",
      end_date: "2026-03-07",
      reason: "Medical appointment",
      employee: { id: 2, user: { id: 102, name: "Bob Smith", email: "bob@test.local" }, department: "HR", position: "Coordinator" },
      created_at: "2026-03-04T10:00:00Z",
    },
    {
      id: 3,
      type: "unpaid",
      status: "rejected",
      start_date: "2026-03-20",
      end_date: "2026-03-22",
      reason: "Personal matter",
      employee: { id: 3, user: { id: 103, name: "Carol White", email: "carol@test.local" }, department: "Operations", position: "Supervisor" },
      created_at: "2026-03-15T09:00:00Z",
    },
  ],
  pagination: { total: 3, per_page: 15, current_page: 1, last_page: 1 },
};

const hrMetadata = {
  success: true,
  message: "",
  data: {
    departments: ["Operations", "HR"],
    availability_statuses: [
      { label: "Available", value: "available" },
      { label: "On Leave", value: "on_leave" },
    ],
    time_off_types: [
      { label: "Vacation", value: "vacation" },
      { label: "Sick Leave", value: "sick_leave" },
      { label: "Unpaid", value: "unpaid" },
    ],
    time_off_statuses: [
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
};

describe("Time-Off page", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });

    cy.intercept("GET", "**/api/metadata/hr", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: hrMetadata,
    }).as("getHrMetadata");

    cy.intercept("GET", "**/api/time-off*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: timeOffRequests,
    }).as("getTimeOff");
  });

  it("HR04 – renders time-off requests with employee name and status", () => {
    cy.visitAuthenticated("/time-off");
    cy.wait("@getMe");
    cy.wait("@getHrMetadata");
    cy.wait("@getTimeOff");

    cy.contains("Alice Johnson").should("be.visible");
    cy.contains("Bob Smith").should("be.visible");
    cy.contains("Carol White").should("be.visible");

    cy.contains(/pending/i).should("be.visible");
    cy.contains(/approved/i).should("be.visible");
    cy.contains(/rejected/i).should("be.visible");
  });

  it("HR04b – shows Request Time-Off button when user has permission", () => {
    cy.visitAuthenticated("/time-off");
    cy.wait("@getMe");
    cy.wait("@getHrMetadata");
    cy.wait("@getTimeOff");

    cy.contains("button", /request time.off|new request/i).should("be.visible");
  });
});

