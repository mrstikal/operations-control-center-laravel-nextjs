import type { Permission } from "./types";

export function hasPermission(
  permissions: Permission[] | undefined,
  resource: string,
  action: string
): boolean {
  if (!permissions?.length) return false;
  return permissions.some((p) => p.resource === resource && p.action === action);
}

export function canView(permissions: Permission[] | undefined, resource: string): boolean {
  return hasPermission(permissions, resource, "view");
}

export function canCreate(permissions: Permission[] | undefined, resource: string): boolean {
  return hasPermission(permissions, resource, "create");
}

export function canEdit(permissions: Permission[] | undefined, resource: string): boolean {
  return hasPermission(permissions, resource, "edit");
}

export function canDelete(permissions: Permission[] | undefined, resource: string): boolean {
  return hasPermission(permissions, resource, "delete");
}

export function canApprove(permissions: Permission[] | undefined, resource: string): boolean {
  return hasPermission(permissions, resource, "approve");
}

export function can(resource: string, action: string, permissions?: Permission[]): boolean {
  return hasPermission(permissions, resource, action);
}

export function canViewContracts(permissions: Permission[] | undefined): boolean {
  return canView(permissions, "contracts");
}

export function canApproveContract(permissions: Permission[] | undefined): boolean {
  return canApprove(permissions, "contracts");
}

export function canEscalateIncident(permissions: Permission[] | undefined): boolean {
  return hasPermission(permissions, "incidents", "escalate");
}

export function canCloseIncident(permissions: Permission[] | undefined): boolean {
  return hasPermission(permissions, "incidents", "close");
}

export function canEditAsset(permissions: Permission[] | undefined): boolean {
  return hasPermission(permissions, "assets", "edit");
}

export function canDeleteAsset(permissions: Permission[] | undefined): boolean {
  return hasPermission(permissions, "assets", "delete");
}
