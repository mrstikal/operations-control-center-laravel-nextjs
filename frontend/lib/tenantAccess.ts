import type { Me, UserRole } from "@/lib/types";

function hasRoleByName(roles: UserRole[] | undefined, roleName: string): boolean {
  return (roles ?? []).some((role) => role.name === roleName);
}

/**
 * FE fallback for tenant filtering capabilities.
 *
 * Primary source of truth is `can_filter_by_tenant` from backend.
 * If that flag is missing/stale, infer capability from Admin/Superadmin roles.
 */
export function canFilterByTenantContext(user: Pick<Me, "can_filter_by_tenant" | "roles"> | null | undefined): boolean {
  if (!user) {
    return false;
  }

  if (user.can_filter_by_tenant === true) {
    return true;
  }

  return hasRoleByName(user.roles, "Superadmin") || hasRoleByName(user.roles, "Admin");
}

