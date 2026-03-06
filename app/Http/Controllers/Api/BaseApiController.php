<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Tenancy\TenantAccessService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * BaseApiController - Abstract base class for all API controllers.
 *
 * Provides shared helpers for response formatting, error handling
 * and tenant access resolution.
 */
abstract class BaseApiController extends Controller
{
    use AuthorizesRequests;

    /** @var array<int,bool> */
    private array $archivedTenantCache = [];

    protected function tenantAccess(): TenantAccessService
    {
        return app(TenantAccessService::class);
    }

    protected function success($data = null, $message = 'Success', $statusCode = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $statusCode);
    }

    /**
     * Paginated response helper
     */
    protected function paginated($data, $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data->items(),
            'pagination' => [
                'total' => $data->total(),
                'per_page' => $data->perPage(),
                'current_page' => $data->currentPage(),
                'last_page' => $data->lastPage(),
                'from' => $data->firstItem(),
                'to' => $data->lastItem(),
            ],
        ]);
    }

    /**
     * Error response helper
     */
    protected function error($message = 'Error', $statusCode = 400, $data = null): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $message,
        ];

        if ($data !== null) {
            $response['data'] = $data;
        }

        return response()->json($response, $statusCode);
    }

    /**
     * Not found response
     */
    protected function notFound($message = 'Resource not found'): JsonResponse
    {
        return $this->error($message, 404);
    }

    /**
     * Unauthorized response
     */
    protected function unauthorized($message = 'Unauthorized'): JsonResponse
    {
        return $this->error($message, 401);
    }

    /**
     * Forbidden response
     */
    protected function forbidden($message = 'Forbidden'): JsonResponse
    {
        return $this->error($message, 403);
    }

    /**
     * Created response (HTTP 201)
     */
    protected function created($data, $message = 'Created successfully'): JsonResponse
    {
        return $this->success($data, $message, 201);
    }

    /**
     * No content response (HTTP 204)
     */
    protected function noContent(): Response
    {
        return response()->noContent();
    }

    /**
     * Get current tenant from authenticated user or request
     *
     * For superadmin/admin: allows tenant_id override from request
     * For other roles: always returns user's tenant_id
     */
    protected function getTenantId(): int
    {
        return $this->tenantAccess()->resolveTenantId(auth()->user(), request());
    }

    /**
     * Get effective tenant scope for list endpoints.
     *
     * Returns null when Admin/Superadmin explicitly requests all tenants.
     */
    protected function getOptionalTenantId(): ?int
    {
        return $this->tenantAccess()->resolveOptionalTenantId(auth()->user(), request());
    }

    /**
     * Check if current user can filter by tenant
     */
    protected function canFilterByTenant(): bool
    {
        return $this->tenantAccess()->canFilterByTenant(auth()->user());
    }

    /**
     * Assert that current user can access a specific tenant.
     */
    protected function assertTenantAccess(int $tenantId): void
    {
        $this->tenantAccess()->assertTenantAccess(auth()->user(), $tenantId);
    }

    /**
     * Assert tenant context is valid for write operations and return tenant id.
     */
    protected function assertWritableTenant(?int $tenantId = null): int
    {
        $tenantId ??= $this->getTenantId();

        $this->tenantAccess()->assertWritableTenant(auth()->user(), $tenantId, request());

        return $tenantId;
    }

    /**
     * Check if a tenant is archived
     */
    protected function isArchivedTenant(int $tenantId): bool
    {
        if (array_key_exists($tenantId, $this->archivedTenantCache)) {
            return $this->archivedTenantCache[$tenantId];
        }

        $tenant = \App\Models\Tenant::withTrashed()->find($tenantId);

        return $this->archivedTenantCache[$tenantId] = (bool) ($tenant && $tenant->trashed());
    }

    /**
     * Check if operations are allowed for archived tenant
     * Read-only operations are allowed, but write operations are not (except employee transfers)
     */
    protected function checkArchivedTenantForWrite(int $tenantId): bool
    {
        return ! $this->isArchivedTenant($tenantId);
    }
}
