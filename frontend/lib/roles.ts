import type { UserRole } from "./types";

/**
 * Role utility functions
 */

export function getHighestRole(roles?: UserRole[]): UserRole | null {
  if (!roles || roles.length === 0) return null;
  return roles.reduce((highest, current) => (current.level > highest.level ? current : highest));
}

export function hasRoleLevel(roles: UserRole[] | undefined, minLevel: number): boolean {
  const highest = getHighestRole(roles);
  return highest ? highest.level >= minLevel : false;
}

export function isSuperadmin(roles?: UserRole[]): boolean {
  return hasRoleLevel(roles, 5);
}

export function isAdmin(roles?: UserRole[]): boolean {
  return hasRoleLevel(roles, 4);
}

export function isManager(roles?: UserRole[]): boolean {
  return hasRoleLevel(roles, 3);
}

export function isTechnician(roles?: UserRole[]): boolean {
  return hasRoleLevel(roles, 2);
}

export function isViewer(roles?: UserRole[]): boolean {
  const highest = getHighestRole(roles);
  return highest ? highest.level === 1 : false;
}

export function isViewerClient(roles?: UserRole[]): boolean {
  return roles?.some((r) => r.name === "Viewer – Client") ?? false;
}

export function canSeeBusinessMetrics(roles?: UserRole[]): boolean {
  // Business metrics are hidden for "Viewer – Client" only
  return !isViewerClient(roles);
}

export function canSeeOperationalMetrics(roles?: UserRole[]): boolean {
  // Operational metrics are visible for everyone EXCEPT Viewer-Client
  return !isViewerClient(roles);
}

export function getRoleBadgeColor(role: UserRole | null): string {
  if (!role) {
    // gray
    return "#64748b";
  }

  switch (role.level) {
    case 5: {
      // superadmin - red
      return "#dc2626";
    }
    case 4: {
      // admin - orange
      return "#ea580c";
    }
    case 3: {
      // manager - cyan
      return "#0891b2";
    }
    case 2: {
      // technician - violet
      return "#7c3aed";
    }
    case 1.3: {
      // viewer-management - blue
      return "#1976D2";
    }
    case 1.2: {
      // viewer-auditor - dark green
      return "#388E3C";
    }
    case 1.1: {
      // viewer-client - dark orange
      return "#F57C00";
    }
    case 1: {
      // viewer - green
      return "#16a34a";
    }
    default:
      return "#64748b";
  }
}

export type { UserRole };
