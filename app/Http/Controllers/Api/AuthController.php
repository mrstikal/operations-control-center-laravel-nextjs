<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\UserResource;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * AuthController - Authentication API endpoints.
 */
class AuthController extends BaseApiController
{
    /**
     * POST /api/login
     * User login endpoint.
     */
    public function login(): JsonResponse
    {
        $sessionGuardError = $this->ensureSessionAuthContext();
        if ($sessionGuardError) {
            return $sessionGuardError;
        }

        $credentials = request()->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:8',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return $this->unauthorized('Invalid credentials');
        }

        if (request()->hasSession()) {
            auth()->guard('web')->login($user);
            request()->session()->regenerate();
        }

        // Update last login
        $user->updateLastLogin();

        return $this->success([
            'user' => new UserResource($user->load(['roles' => fn ($q) => $q->with('permissions')], 'employeeProfile')),
        ], 'Logged in successfully');
    }

    /**
     * POST /api/register
     * User registration endpoint.
     */
    public function register(): JsonResponse
    {
        $sessionGuardError = $this->ensureSessionAuthContext();
        if ($sessionGuardError) {
            return $sessionGuardError;
        }

        $validated = request()->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'tenant_id' => 'required|integer|exists:tenants,id',
        ]);

        // Ensure the requested tenant is active and not archived (soft-deleted).
        $tenant = Tenant::where('id', $validated['tenant_id'])
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->first();

        if (! $tenant) {
            return $this->error('The selected tenant is not available for registration.', 422);
        }

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'status' => 'active',
        ]);

        // Assign default Viewer role
        $viewerRole = \App\Models\Role::where('name', 'Viewer')->first();
        if ($viewerRole) {
            $user->roles()->attach($viewerRole);
        }

        return $this->created([
            'user' => new UserResource($user->load(['roles' => fn ($q) => $q->with('permissions')])),
        ], 'User registered successfully');
    }

    /**
     * GET /api/me
     * Get current authenticated user details.
     */
    public function me(): JsonResponse
    {
        $user = auth()->user();

        if (! $user) {
            return $this->unauthorized('Unauthorized');
        }

        // Load auth roles/permissions without tenant scope to keep identity roles stable
        // even when runtime tenant context is switched (default/header/query tenant).
        $roles = $user->roles()
            ->withoutGlobalScope('tenant')
            ->with([
                'permissions' => fn ($q) => $q->withoutGlobalScope('tenant'),
            ])
            ->get();
        $user->setRelation('roles', $roles);

        // Load employee profile if not already loaded
        if (! $user->relationLoaded('employeeProfile')) {
            $user->load('employeeProfile');
        }

        // Check if user can filter by tenant
        $canFilterByTenant = $user->isAdmin();

        $userData = (new UserResource($user))->toArray(request());
        $userData['can_filter_by_tenant'] = $canFilterByTenant;
        $userData['default_tenant_id'] = $user->getDefaultTenantId();
        $tenant = Tenant::withTrashed()->find($user->tenant_id);
        $userData['tenant'] = $tenant ? [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'deleted_at' => $tenant->deleted_at?->toIso8601String(),
        ] : null;
        $userData['tenant_archived'] = (bool) ($tenant?->trashed());

        return $this->success(
            $userData,
            'Current user'
        );
    }

    /**
     * POST /api/me/default-tenant
     * Save default tenant context for Admin/Superadmin roles.
     */
    public function setDefaultTenant(Request $request): JsonResponse
    {
        $user = auth()->user();
        $isSuperadmin = $user?->isSuperadmin() === true;

        if (! $user || ! $user->isAdmin()) {
            return $this->forbidden('Only Admin and Superadmin can change default tenant');
        }

        $validated = $request->validate([
            'tenant_id' => ['required', 'integer', 'exists:tenants,id'],
        ]);

        $tenant = Tenant::withTrashed()->find($validated['tenant_id']);
        if (! $tenant) {
            return $this->error('Selected tenant is not available', 422);
        }

        if ($isSuperadmin) {
            $isAllowedForSuperadmin = $tenant->status === 'active' || $tenant->trashed();
            if (! $isAllowedForSuperadmin) {
                return $this->error('Selected tenant is not available', 422);
            }
        } elseif ($tenant->trashed() || $tenant->status !== 'active') {
            return $this->error('Selected tenant is not available', 422);
        }

        $user->setDefaultTenantId((int) $validated['tenant_id']);

        return $this->success([
            'default_tenant_id' => (int) $validated['tenant_id'],
        ], 'Default tenant updated');
    }

    /**
     * POST /api/logout
     * User logout endpoint.
     */
    public function logout(): JsonResponse
    {

        $user = auth()->user();
        if ($user) {
            $user->tokens()->delete();
        }

        if (request()->hasSession()) {
            request()->session()->invalidate();
            request()->session()->regenerateToken();
        }

        auth()->guard('web')->logout();

        return $this->success(null, 'Logged out successfully');
    }

    /**
     * Keep auth endpoints behavior consistent for environments requiring session auth.
     */
    private function ensureSessionAuthContext(): ?JsonResponse
    {
        if (! request()->hasSession() && ! app()->environment('testing')) {
            return $this->error('Session authentication is required for this endpoint', 400);
        }

        return null;
    }
}
