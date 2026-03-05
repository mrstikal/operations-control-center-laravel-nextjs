<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy extends BasePolicy
{
    /**
     * Determine if the user can view other users.
     */
    public function view(User $authUser, User $user): bool
    {
        // Tenant isolation
        if ($authUser->tenant_id !== $user->tenant_id) {
            return false;
        }

        return $authUser->hasPermission('users', 'view');
    }

    /**
     * Determine if the user can view their own profile.
     */
    public function viewOwn(User $authUser, User $user): bool
    {
        return $authUser->id === $user->id;
    }

    /**
     * Determine if the user can create users.
     */
    public function create(User $authUser): bool
    {
        return $authUser->hasPermission('users', 'create');
    }

    /**
     * Determine if the user can update users.
     */
    public function update(User $authUser, User $user): bool
    {
        // Tenant isolation
        if ($authUser->tenant_id !== $user->tenant_id) {
            return false;
        }

        // Can update own profile, or has edit permission
        if ($authUser->id === $user->id) {
            return true; // Can always edit own profile
        }

        return $authUser->hasPermission('users', 'edit');
    }

    /**
     * Determine if the user can delete users.
     */
    public function delete(User $authUser, User $user): bool
    {
        // Tenant isolation
        if ($authUser->tenant_id !== $user->tenant_id) {
            return false;
        }

        // Cannot delete self
        if ($authUser->id === $user->id) {
            return false;
        }

        return $authUser->hasPermission('users', 'delete');
    }

    /**
     * Determine if the user can assign roles.
     */
    public function assignRole(User $authUser, User $user): bool
    {
        // Tenant isolation
        if ($authUser->tenant_id !== $user->tenant_id) {
            return false;
        }

        // Cannot assign higher roles than you have
        $authUserLevel = $authUser->roles()->max('level') ?? 0;
        $targetUserLevel = $user->roles()->max('level') ?? 0;

        if ($targetUserLevel > $authUserLevel) {
            return false;
        }

        return $authUser->hasPermission('users', 'assign_role');
    }

    /**
     * Determine if the user can restore a soft-deleted user.
     */
    public function restore(User $authUser, User $user): bool
    {
        return $authUser->hasPermission('users', 'edit');
    }

    /**
     * Determine if the user can permanently delete a user.
     */
    public function forceDelete(User $authUser, User $user): bool
    {
        return $authUser->hasPermission('users', 'delete');
    }
}

