<?php

namespace App\Services\Tenancy;

use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class TenantAccessService
{
    /**
     * @var array<int,bool>
     */
    private array $tenantFilterPermissionCache = [];

    private function tenantFilterCacheKey(User $user, ?Request $request = null): string
    {
        $request ??= request();
        $requestKey = (string) spl_object_id($request);

        return $requestKey.':'.$user->id;
    }

    /**
     * Determine whether a user can select tenant context via request/header filters.
     */
    public function canFilterByTenant(?User $user, ?Request $request = null): bool
    {
        if (! $user) {
            return false;
        }

        $cacheKey = $this->tenantFilterCacheKey($user, $request);

        if (array_key_exists($cacheKey, $this->tenantFilterPermissionCache)) {
            return $this->tenantFilterPermissionCache[$cacheKey];
        }

        // Fast path for requests where roles are already preloaded (e.g. dashboard controllers).
        if ($user->relationLoaded('roles')) {
            $canFilter = $user->roles
                ->pluck('name')
                ->filter(fn ($name) => is_string($name) && $name !== '')
                ->intersect(['Admin', 'Superadmin'])
                ->isNotEmpty();

            $this->tenantFilterPermissionCache[$cacheKey] = $canFilter;

            return $canFilter;
        }

        // Use direct pivot lookup to avoid false negatives caused by tenant model scopes.
        $canFilter = DB::table('user_roles')
            ->join('roles', 'roles.id', '=', 'user_roles.role_id')
            ->where('user_roles.user_id', $user->id)
            ->whereIn('roles.name', ['Admin', 'Superadmin'])
            ->whereNull('roles.deleted_at')
            ->exists();

        $this->tenantFilterPermissionCache[$cacheKey] = $canFilter;

        return $canFilter;
    }

    /**
     * Resolve effective tenant context using current precedence rules.
     *
     * @throws AuthenticationException when called without an authenticated user.
     */
    public function resolveTenantId(?User $user, ?Request $request = null, ?int $fallbackTenantId = null): int
    {
        if (! $user) {
            throw new AuthenticationException('Tenant context requires an authenticated user.');
        }

        $request ??= request();

        $requestTenantId = (int) $request->input('tenant_id');
        $headerTenantId = (int) $request->header('X-Tenant-Id');
        $canFilterByTenant = $this->canFilterByTenant($user, $request);

        if ($canFilterByTenant && $requestTenantId > 0) {
            return $requestTenantId;
        }

        if ($canFilterByTenant && $headerTenantId > 0) {
            return $headerTenantId;
        }

        if ($canFilterByTenant && $fallbackTenantId && $fallbackTenantId > 0) {
            return $fallbackTenantId;
        }

        $defaultTenantId = $user->getDefaultTenantId();
        if ($canFilterByTenant && $defaultTenantId) {
            return $defaultTenantId;
        }

        return (int) $user->tenant_id;
    }

    /**
     * Resolve tenant scope for list/read endpoints.
     */
    public function resolveOptionalTenantId(?User $user, ?Request $request = null): ?int
    {
        $request ??= request();

        if ($this->canFilterByTenant($user, $request) && $request->boolean('all_tenants')) {
            return null;
        }

        return $this->resolveTenantId($user, $request);
    }

    /**
     * Check whether user can access a concrete tenant.
     */
    public function userCanAccessTenant(?User $user, int $tenantId): bool
    {
        if (! $user || $tenantId <= 0) {
            return false;
        }

        if ($this->canFilterByTenant($user)) {
            return true;
        }

        return (int) $user->tenant_id === $tenantId;
    }

    /**
     * Assert that the current user can access the requested tenant.
     */
    public function assertTenantAccess(?User $user, int $tenantId): void
    {
        if (! $this->userCanAccessTenant($user, $tenantId)) {
            throw new AccessDeniedHttpException('Tenant isolation violation');
        }
    }

    /**
     * Assert that tenant context is valid for write operations.
     */
    public function assertWritableTenant(?User $user, int $tenantId, ?Request $request = null): void
    {
        $request ??= request();

        if ($request->boolean('all_tenants')) {
            throw new AccessDeniedHttpException('all_tenants is read-only and cannot be used for write operations');
        }

        $this->assertTenantAccess($user, $tenantId);
    }
}
