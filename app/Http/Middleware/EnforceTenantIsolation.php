<?php

namespace App\Http\Middleware;

use App\Services\Tenancy\TenantAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware pro tenant isolation
 *
 * Zajišťuje že uživatelé mohou přistupovat jen k datům svého tenanta
 */
class EnforceTenantIsolation
{
    public function __construct(private readonly TenantAccessService $tenantAccess) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->check()) {
            $user = auth()->user();

            if ($request->boolean('all_tenants') && in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
                return response()->json([
                    'message' => 'all_tenants is read-only and cannot be used for write operations',
                ], 403);
            }

            $requestTenantId = (int) $request->input('tenant_id');
            $headerTenantId = (int) $request->header('X-Tenant-Id');

            if ($requestTenantId > 0) {
                try {
                    $this->tenantAccess->assertTenantAccess($user, $requestTenantId);
                } catch (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException) {
                    return response()->json(['message' => 'Tenant isolation violation'], 403);
                }
            }

            if ($headerTenantId > 0) {
                try {
                    $this->tenantAccess->assertTenantAccess($user, $headerTenantId);
                } catch (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException) {
                    return response()->json(['message' => 'Tenant isolation violation'], 403);
                }
            }

            $effectiveTenantId = $this->tenantAccess->resolveTenantId($user, $request);

            if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
                try {
                    $this->tenantAccess->assertWritableTenant($user, $effectiveTenantId, $request);
                } catch (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e) {
                    return response()->json(['message' => $e->getMessage()], 403);
                }
            }

            $request->merge([
                'current_user_tenant_id' => $effectiveTenantId,
            ]);

            // Apply effective tenant to the in-memory authenticated user for policy checks.
            if ($this->tenantAccess->canFilterByTenant($user)) {
                $user->setAttribute('tenant_id', $effectiveTenantId);
            }
        }

        return $next($request);
    }
}
