export function normalizeContractTenantId(
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

export function buildContractScopeQuery(tenantId: number | string | null | undefined) {
  const normalizedTenantId = normalizeContractTenantId(tenantId);

  return normalizedTenantId ? { tenant_id: normalizedTenantId } : undefined;
}

export function buildContractScopeOptions(tenantId: number | string | null | undefined) {
  return normalizeContractTenantId(tenantId) ? { skipTenantHeader: true as const } : undefined;
}

export function buildContractDetailPath(
  contractId: number | string,
  tenantId?: number | string | null
): string {
  const normalizedTenantId = normalizeContractTenantId(tenantId);

  if (!normalizedTenantId) {
    return `/contracts/${contractId}`;
  }

  const params = new URLSearchParams({ tenant_id: String(normalizedTenantId) });
  return `/contracts/${contractId}?${params.toString()}`;
}

