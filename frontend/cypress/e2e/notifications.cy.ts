// NT01 – List notifikací – zobrazení, stránkování
// NT02 – Označení notifikace jako přečtené
// NT03 – Označit vše jako přečtené

type NotificationRow = {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "critical";
  read_at: string | null;
  created_at: string;
};

const notifications: NotificationRow[] = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  type: "incident_created",
  title: `Notification ${index + 1}`,
  message: `Message for notification ${index + 1}`,
  priority: index % 2 === 0 ? "high" : "medium",
  read_at: index < 3 ? null : "2026-03-01T10:00:00Z",
  created_at: "2026-03-10T08:00:00Z",
}));

const notificationsBody = {
  success: true,
  message: "",
  data: notifications,
  pagination: { total: 6, per_page: 15, current_page: 1, last_page: 1 },
};

describe("Notifications page", () => {
  beforeEach(() => {
    cy.mockAuthenticatedSession({ roleLevel: 4 });

    cy.intercept("GET", "**/api/notifications*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: notificationsBody,
    }).as("getNotifications");

    cy.intercept("GET", "**/api/users*", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "", data: [] },
    }).as("getUsers");
  });

  it("NT01 – renders notifications list with titles and read status", () => {
    cy.visitAuthenticated("/notifications");
    cy.wait("@getMe");
    cy.wait("@getNotifications");

    cy.contains("h1", "Notifications").should("be.visible");
    cy.contains("Notification 1").should("be.visible");
    cy.contains("Notification 6").should("be.visible");
    cy.contains("Total 6 · Page 1 of 1").should("be.visible");
  });

  it("NT02 – marks a single notification as read", () => {
    cy.intercept("POST", "**/api/notifications/1/mark-read", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "Notification marked as read", data: null },
    }).as("markRead");

    cy.visitAuthenticated("/notifications");
    cy.wait("@getMe");
    cy.wait("@getNotifications");

    // Click "Mark read" for the first unread notification
    cy.contains("tr", "Notification 1")
      .within(() => {
        cy.contains("button", /mark read|read/i).click({ force: true });
      });

    cy.wait("@markRead");
  });

  it("NT03 – marks all notifications as read", () => {
    cy.intercept("POST", "**/api/notifications/mark-all-read", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { success: true, message: "All notifications marked as read", data: null },
    }).as("markAllRead");

    cy.visitAuthenticated("/notifications");
    cy.wait("@getMe");
    cy.wait("@getNotifications");

    cy.contains("button", /mark all.*read/i).click({ force: true });
    cy.wait("@markAllRead");
  });
});

