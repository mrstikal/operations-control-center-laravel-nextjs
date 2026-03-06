<?php

namespace App\Http\Controllers\Api;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TenantController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $includeArchived = $request->boolean('include_archived') && $this->isSuperadmin();

        $query = Tenant::query();

        if ($includeArchived) {
            $query->withTrashed()->where(function ($tenantQuery) {
                $tenantQuery->where('status', 'active')
                    ->orWhereNotNull('deleted_at');
            });
        } else {
            $query->where('status', 'active')->whereNull('deleted_at');
        }

        $tenants = $query
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'deleted_at']);

        return $this->success($tenants, 'Tenants retrieved successfully');
    }

    public function managementIndex(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'suspended', 'inactive', 'archived'])],
            'sort_by' => ['nullable', Rule::in(['name', 'status', 'created_at'])],
            'sort_order' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $status = $validated['status'] ?? null;
        $archivedView = $status === 'archived';

        $query = Tenant::query()->withTrashed();

        if ($archivedView) {
            $query->onlyTrashed();
        } else {
            $query->whereNull('deleted_at');
        }

        if (! empty($validated['search'])) {
            $search = trim((string) $validated['search']);
            $query->where(function ($subQuery) use ($search) {
                $subQuery->where('name', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
        }

        if (! empty($status) && ! $archivedView) {
            $query->where('status', $status);
        }

        $sortBy = $validated['sort_by'] ?? 'name';
        $sortOrder = $validated['sort_order'] ?? 'asc';

        $query->orderBy($sortBy, $sortOrder);

        $perPage = (int) ($validated['per_page'] ?? 15);

        $tenants = $query->paginate(
            $perPage,
            [
                'id',
                'name',
                'description',
                'status',
                'activated_at',
                'suspended_at',
                'created_at',
                'updated_at',
                'deleted_at',
            ]
        )->through(fn (Tenant $tenant) => $this->transformManagementTenant($tenant));

        return $this->paginated($tenants, 'Tenant management list retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:tenants,name'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['active', 'suspended', 'inactive'])],
        ]);

        $status = $validated['status'] ?? 'active';
        $normalizedName = trim($validated['name']);

        $tenant = Tenant::create([
            'name' => $normalizedName,
            'description' => $validated['description'] ?? null,
            'status' => $status,
            'activated_at' => $status === 'active' ? now() : null,
            'suspended_at' => $status === 'suspended' ? now() : null,
        ]);

        return $this->created($this->transformManagementTenant($tenant), 'Tenant created successfully');
    }

    public function update(Request $request, int $tenantId): JsonResponse
    {
        $tenant = Tenant::withTrashed()->find($tenantId);
        if (! $tenant) {
            return $this->notFound('Tenant not found');
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('tenants', 'name')->ignore($tenant->id)],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['active', 'suspended', 'inactive'])],
        ]);

        if (array_key_exists('name', $validated)) {
            $validated['name'] = trim($validated['name']);
        }

        if (array_key_exists('status', $validated)) {
            if ($validated['status'] === 'active') {
                $validated['activated_at'] = now();
                $validated['suspended_at'] = null;
            }

            if ($validated['status'] === 'suspended') {
                $validated['suspended_at'] = now();
            }

            if ($validated['status'] === 'inactive') {
                $validated['suspended_at'] = null;
            }
        }

        $tenant->update($validated);

        return $this->success($this->transformManagementTenant($tenant->fresh()), 'Tenant updated successfully');
    }

    public function destroy(int $tenantId): JsonResponse
    {
        $tenant = Tenant::find($tenantId);
        if (! $tenant) {
            return $this->notFound('Tenant not found');
        }

        $usersCount = User::query()
            ->where('tenant_id', $tenant->id)
            ->count();

        if ($usersCount > 0) {
            return $this->error(
                "Cannot archive tenant '{$tenant->name}'. {$usersCount} user(s) are still assigned.",
                409,
                [
                    'code' => 'TENANT_HAS_USERS',
                    'users_count' => $usersCount,
                ]
            );
        }

        $tenant->delete();

        return $this->success(null, 'Tenant archived successfully');
    }

    public function usersForTransfer(int $tenantId): JsonResponse
    {
        $tenant = Tenant::find($tenantId);
        if (! $tenant) {
            return $this->notFound('Tenant not found');
        }

        $users = User::query()
            ->where('tenant_id', $tenant->id)
            ->orderBy('name')
            ->orderBy('id')
            ->get(['id', 'name', 'email', 'status', 'created_at']);

        return $this->success(
            [
                'users_count' => $users->count(),
                'users' => $users,
                'available_tenants' => $this->availableTransferTenants($tenant->id),
            ],
            'Users for tenant transfer retrieved successfully'
        );
    }

    public function archiveWithTransfer(Request $request, int $tenantId): JsonResponse
    {
        $sourceTenant = Tenant::find($tenantId);
        if (! $sourceTenant) {
            return $this->notFound('Tenant not found');
        }

        $validated = $request->validate([
            'target_tenant_id' => ['required', 'integer', 'not_in:'.$sourceTenant->id],
        ]);

        $targetTenant = Tenant::withTrashed()
            ->where('id', (int) $validated['target_tenant_id'])
            ->first();

        if (! $targetTenant) {
            return $this->error('Invalid target_tenant_id. Tenant not found.', 422);
        }

        if ($targetTenant->trashed()) {
            return $this->error('Invalid target_tenant_id. Archived tenant cannot be selected.', 422);
        }

        $movedUsersCount = DB::transaction(function () use ($sourceTenant, $targetTenant) {
            $movedUsersCount = User::query()
                ->where('tenant_id', $sourceTenant->id)
                ->update([
                    'tenant_id' => $targetTenant->id,
                    'updated_at' => now(),
                ]);

            $sourceTenant->delete();

            return $movedUsersCount;
        });

        return $this->success(
            [
                'moved_users_count' => $movedUsersCount,
                'source_tenant_id' => $sourceTenant->id,
                'target_tenant_id' => $targetTenant->id,
            ],
            "Tenant '{$sourceTenant->name}' archived and users transferred successfully"
        );
    }

    public function restore(int $tenantId): JsonResponse
    {

        $tenant = Tenant::withTrashed()->find($tenantId);
        if (! $tenant) {
            return $this->notFound('Tenant not found');
        }

        if (! $tenant->trashed()) {
            return $this->error('Tenant is not archived', 422);
        }

        $tenant->restore();

        return $this->success($this->transformManagementTenant($tenant->fresh()), 'Tenant restored successfully');
    }

    public function hardDelete(int $tenantId): JsonResponse
    {
        return $this->forbidden('Hard delete for tenants is disabled');
    }

    private function isSuperadmin(): bool
    {
        return Auth::user()?->hasRole('Superadmin') === true;
    }

    private function transformManagementTenant(Tenant $tenant): array
    {
        return [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'description' => $tenant->description,
            'status' => $tenant->status,
            'activated_at' => $tenant->activated_at,
            'suspended_at' => $tenant->suspended_at,
            'created_at' => $tenant->created_at,
            'updated_at' => $tenant->updated_at,
            'deleted_at' => $tenant->deleted_at,
        ];
    }

    private function availableTransferTenants(int $sourceTenantId)
    {
        return Tenant::query()
            ->where('id', '!=', $sourceTenantId)
            ->orderBy('name')
            ->get(['id', 'name', 'status']);
    }
}
