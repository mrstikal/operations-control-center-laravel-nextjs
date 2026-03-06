<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * UserController - REST API for Users.
 */
class UserController extends BaseApiController
{
    /**
     * GET /api/users
     * List all users in the current tenant.
     */
    public function index(): JsonResponse
    {
        $users = User::ofTenant($this->getTenantId())
            ->with(['roles' => fn ($q) => $q->with('permissions')], 'employeeProfile')
            ->when(request('role'), fn ($q) => $q->whereHas('roles', fn ($r) => $r->where('name', request('role'))))
            ->when(request('status'), fn ($q) => $q->where('status', request('status')))
            ->when(request('search'), fn ($q) => $q->where('name', 'like', '%'.request('search').'%')->orWhere('email', 'like', '%'.request('search').'%'))
            ->orderBy('created_at', 'desc')
            ->paginate(request('per_page', 15));

        return $this->paginated($users, 'Users retrieved successfully');
    }

    /**
     * GET /api/users/{id}
     * Get user details.
     */
    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return $this->success(
            new UserResource($user->load(['roles' => fn ($q) => $q->with('permissions')], 'employeeProfile')),
            'User retrieved successfully'
        );
    }

    /**
     * GET /api/users/profile/me
     * Get current authenticated user profile.
     */
    public function profile(): JsonResponse
    {
        return $this->success(
            new UserResource(auth()->user()->load(['roles' => fn ($q) => $q->with('permissions')], 'employeeProfile')),
            'Current user profile'
        );
    }

    /**
     * PUT /api/users/{id}/update-profile
     * Update user profile.
     */
    public function updateProfile(User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $validated = request()->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'bio' => 'sometimes|string|max:500',
            'avatar_url' => 'sometimes|url',
            'preferences' => 'sometimes|json',
        ]);

        $user->update($validated);

        return $this->success(
            new UserResource($user->fresh()->load(['roles' => fn ($q) => $q->with('permissions')], 'employeeProfile')),
            'Profile updated successfully'
        );
    }

    /**
     * POST /api/users/{id}/assign-role
     * Assign a role to user.
     */
    public function assignRole(User $user): JsonResponse
    {
        $this->authorize('assignRole', $user);

        $validated = request()->validate([
            'role_id' => 'required|exists:roles,id',
        ]);

        $role = \App\Models\Role::find($validated['role_id']);

        if (! $user->roles->contains($role)) {
            $user->roles()->attach($role);
        }

        return $this->success(
            new UserResource($user->fresh()->load(['roles' => fn ($q) => $q->with('permissions')])),
            'Role assigned successfully'
        );
    }

    /**
     * DELETE /api/users/{id}/remove-role/{roleId}
     * Odebere roli od uživatele
     */
    public function removeRole(User $user, $roleId): JsonResponse
    {
        $this->authorize('assignRole', $user);

        $user->roles()->detach($roleId);

        return $this->success(
            new UserResource($user->fresh()->load(['roles' => fn ($q) => $q->with('permissions')])),
            'Role removed successfully'
        );
    }
}
