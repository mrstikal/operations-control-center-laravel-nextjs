export function normalizeIncidentTenantId(
  tenantId: number | string | null | undefined
): number | undefined {
  if (typeof tenantId === "number") {
    return Number.isInteger(tenantId) && tenantId > 0 ? tenantId : undefined;
  }

  if (typeof tenantId === "string") {
    const trimmedTenantId = tenantId.trim();
    if (!trimmedTenantId) {
      return undefined;
    }

    const parsedTenantId = Number(trimmedTenantId);
    return Number.isInteger(parsedTenantId) && parsedTenantId > 0 ? parsedTenantId : undefined;
  }

  return undefined;
}

export function buildIncidentScopeQuery(tenantId: number | string | null | undefined) {
  const normalizedTenantId = normalizeIncidentTenantId(tenantId);

  return normalizedTenantId ? { tenant_id: normalizedTenantId } : undefined;
}

export function buildIncidentScopeOptions(tenantId: number | string | null | undefined) {
  return normalizeIncidentTenantId(tenantId) ? { skipTenantHeader: true as const } : undefined;
}

export function buildIncidentDetailPath(
  incidentId: number | string,
  tenantId?: number | string | null
): string {
  const normalizedTenantId = normalizeIncidentTenantId(tenantId);

  if (!normalizedTenantId) {
    return `/incidents/${incidentId}`;
  }

  const params = new URLSearchParams({ tenant_id: String(normalizedTenantId) });
  return `/incidents/${incidentId}?${params.toString()}`;
}

