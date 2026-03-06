<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

/**
 * Base Policy - Abstraktní třída pro všechny policies
 * Poskytuje společné metody pro role-based authorization
 */
abstract class BasePolicy
{
    use HandlesAuthorization;

    /**
     * Kontrola zda má uživatel oprávnění
     */
    protected function authorize(User $user, string $resource, string $action): bool
    {
        // Admin/Superadmin má všechno
        if ($user->isAdmin()) {
            return true;
        }

        // Kontrola oprávnění přes role
        return $user->hasPermission($resource, $action);
    }

    /**
     * Kontrola zda má uživatel roli
     */
    protected function hasRole(User $user, string|array $roles): bool
    {
        if (is_string($roles)) {
            return $user->hasRole($roles);
        }

        foreach ($roles as $role) {
            if ($user->hasRole($role)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Kontrola zda má uživatel minimální level
     */
    protected function hasMinimumLevel(User $user, int $minimumLevel): bool
    {
        // Dynamicky zjistit úroveň z role
        $userRoles = $user->roles()->get();
        $maxLevel = 0;

        foreach ($userRoles as $role) {
            $level = $role->getAttribute('level');
            if (is_numeric($level)) {
                $maxLevel = max($maxLevel, (int) $level);
            }
        }

        return $maxLevel >= $minimumLevel;
    }

    /**
     * Kontrola tenant isolation
     */
    protected function belongsToTenant(User $user, $model): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if (! method_exists($model, 'getAttribute')) {
            return true; // Non-eloquent model, skip check
        }

        if (! $model->getAttribute('tenant_id')) {
            return true; // Model bez tenant_id, skip check
        }

        return $user->tenant_id === $model->getAttribute('tenant_id');
    }

    /**
     * Backward compatible alias for tenant checks.
     */
    protected function sameTenant(User $user, $model): bool
    {
        return $this->belongsToTenant($user, $model);
    }
}
