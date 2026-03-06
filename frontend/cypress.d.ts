/// <reference types="cypress" />

type MockAuthenticatedSessionOptions = {
  roleLevel?: number;
  tenantArchived?: boolean;
  sessionId?: string;
};

type VisitAuthenticatedOptions = {
  sessionId?: string;
  tenantId?: number;
};

declare namespace Cypress {
  interface Chainable {
    mockAuthenticatedSession(options?: MockAuthenticatedSessionOptions): Chainable;
    mockViewerSession(): Chainable;
    mockSuperadminSession(): Chainable;
    mockArchivedTenantSession(): Chainable;
    mockApiError(method: string, pattern: string, statusCode?: number): Chainable;
    visitAuthenticated(path: string, options?: VisitAuthenticatedOptions): Chainable;
  }
}

