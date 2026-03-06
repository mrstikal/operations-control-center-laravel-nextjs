type MockAuthenticatedSessionOptions = {
  roleLevel?: number;
  tenantArchived?: boolean;
  sessionId?: string;
};

type VisitAuthenticatedOptions = {
  sessionId?: string;
  tenantId?: number;
};

function createMeResponse(options: MockAuthenticatedSessionOptions = {}) {
  const roleLevel = options.roleLevel ?? 4;
  const defaultPermissions =
    roleLevel >= 4
      ? [
          { resource: "contracts", action: "view" },
          { resource: "contracts", action: "create" },
          { resource: "contracts", action: "edit" },
          { resource: "contracts", action: "delete" },
          { resource: "contracts", action: "approve" },
          { resource: "incidents", action: "view" },
          { resource: "incidents", action: "create" },
          { resource: "incidents", action: "edit" },
          { resource: "incidents", action: "delete" },
          { resource: "incidents", action: "close" },
          { resource: "incidents", action: "escalate" },
          { resource: "assets", action: "view" },
          { resource: "assets", action: "create" },
          { resource: "assets", action: "edit" },
          { resource: "assets", action: "delete" },
          { resource: "assets", action: "log_maintenance" },
          { resource: "assets", action: "schedule_maintenance" },
          { resource: "shifts", action: "manage" },
          { resource: "time_off", action: "view" },
          { resource: "time_off", action: "create" },
          { resource: "time_off", action: "decide" },
        ]
      : [];

  return {
    success: true,
    message: "",
    data: {
      id: 1,
      name: "E2E Admin",
      email: "admin@test.local",
      tenant_id: 1,
      tenant: {
        id: 1,
        name: "ACME Operations",
        deleted_at: options.tenantArchived ? "2026-03-01T10:00:00Z" : null,
      },
      tenant_archived: Boolean(options.tenantArchived),
      can_filter_by_tenant: false,
      permissions: defaultPermissions,
      roles: [{ id: 1, name: "Admin", level: roleLevel, description: "E2E role" }],
    },
  };
}

Cypress.Commands.add("mockAuthenticatedSession", (options: MockAuthenticatedSessionOptions = {}) => {
  const sessionId = options.sessionId ?? "e2e-session";

  // ── Catch-all (registered first = lowest priority in Cypress).
  // Prevents unintercepted API calls from hitting the real backend and
  // triggering 401 → /login?force=1 redirect loops.
  cy.intercept("GET",    "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });
  cy.intercept("POST",   "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });
  cy.intercept("PUT",    "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });
  cy.intercept("PATCH",  "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });
  cy.intercept("DELETE", "**/api/**", { statusCode: 200, headers: { "content-type": "application/json" }, body: { success: true, message: "", data: null } });

  // ── Specific mocks (registered after = higher priority, override catch-all).
  cy.setCookie("laravel_session", sessionId);

  cy.intercept("GET", "**/api/me", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: createMeResponse(options),
  }).as("getMe");

  cy.intercept("GET", "**/api/notifications/unread-count", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: { success: true, message: "", data: { count: 0 } },
  }).as("getUnreadCount");

  cy.intercept("GET", "**/api/tenants*", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: { success: true, message: "", data: [], pagination: { total: 0, per_page: 15, current_page: 1, last_page: 1 } },
  }).as("getTenants");

  cy.intercept("GET", "**/api/metadata/hr", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: {
      success: true,
      message: "",
      data: {
        departments: ["Operations", "HR"],
        availability_statuses: [
          { label: "Available", value: "available" },
          { label: "On Leave", value: "on_leave" },
        ],
        time_off_types: [],
        time_off_statuses: [],
      },
    },
  }).as("getHrMetadata");
});

Cypress.Commands.add("mockViewerSession", () => {
  cy.mockAuthenticatedSession({ roleLevel: 1 });
});

Cypress.Commands.add("mockSuperadminSession", () => {
  cy.mockAuthenticatedSession({ roleLevel: 5 });

  // Override /api/me with superadmin-specific response
  cy.intercept("GET", "**/api/me", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: {
      success: true,
      message: "",
      data: {
        id: 99,
        name: "E2E Superadmin",
        email: "superadmin@test.local",
        tenant_id: 1,
        tenant: { id: 1, name: "ACME Operations", deleted_at: null },
        tenant_archived: false,
        can_filter_by_tenant: true,
        permissions: [
          { resource: "contracts", action: "view" },
          { resource: "contracts", action: "create" },
          { resource: "contracts", action: "edit" },
          { resource: "contracts", action: "delete" },
          { resource: "contracts", action: "approve" },
          { resource: "incidents", action: "view" },
          { resource: "incidents", action: "create" },
          { resource: "incidents", action: "edit" },
          { resource: "incidents", action: "delete" },
          { resource: "incidents", action: "close" },
          { resource: "incidents", action: "escalate" },
          { resource: "assets", action: "view" },
          { resource: "assets", action: "create" },
          { resource: "assets", action: "edit" },
          { resource: "assets", action: "delete" },
          { resource: "assets", action: "log_maintenance" },
          { resource: "assets", action: "schedule_maintenance" },
          { resource: "shifts", action: "manage" },
          { resource: "time_off", action: "view" },
          { resource: "time_off", action: "create" },
          { resource: "time_off", action: "decide" },
        ],
        roles: [{ id: 5, name: "Superadmin", level: 5, description: "Superadmin role" }],
      },
    },
  }).as("getMe");
});

Cypress.Commands.add("mockArchivedTenantSession", () => {
  cy.mockAuthenticatedSession({ roleLevel: 4, tenantArchived: true });
});

Cypress.Commands.add("mockApiError", (method: string, pattern: string, statusCode = 500) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cy.intercept({ method: method as any, url: pattern }, {
    statusCode,
    headers: { "content-type": "application/json" },
    body: { success: false, message: "Server error", data: null },
  });
});

Cypress.Commands.add("visitAuthenticated", (path: string, options: VisitAuthenticatedOptions = {}) => {
  const sessionId = options.sessionId ?? "e2e-session";
  const tenantId = options.tenantId ?? 1;

  cy.setCookie("laravel_session", sessionId);
  cy.visit(path, {
    onBeforeLoad(window: Window) {
      window.localStorage.setItem("occ_default_tenant_id", String(tenantId));
    },
  });
});

export {};

