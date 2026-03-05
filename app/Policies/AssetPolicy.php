<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Asset;

class AssetPolicy extends BasePolicy
{
    /**
     * Determine if the user can view assets.
     */
    public function view(User $user, Asset $asset): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $asset)) {
            return false;
        }

        return $user->hasPermission('assets', 'view');
    }

    /**
     * Determine if the user can create assets.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('assets', 'create');
    }

    /**
     * Determine if the user can update assets.
     */
    public function update(User $user, Asset $asset): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $asset)) {
            return false;
        }

        return $user->hasPermission('assets', 'edit');
    }

    /**
     * Determine if the user can delete assets.
     */
    public function delete(User $user, Asset $asset): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $asset)) {
            return false;
        }

        return $user->hasPermission('assets', 'delete');
    }

    /**
     * Determine if the user can log maintenance.
     */
    public function logMaintenance(User $user, Asset $asset): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $asset)) {
            return false;
        }

        return $user->hasPermission('assets', 'log_maintenance');
    }

    /**
     * Determine if the user can schedule maintenance.
     */
    public function scheduleMaintenance(User $user, Asset $asset): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $asset)) {
            return false;
        }

        return $user->hasPermission('assets', 'schedule_maintenance');
    }

    /**
     * Determine if the user can restore a soft-deleted asset.
     */
    public function restore(User $user, Asset $asset): bool
    {
        return $user->hasPermission('assets', 'edit');
    }

    /**
     * Determine if the user can permanently delete an asset.
     */
    public function forceDelete(User $user, Asset $asset): bool
    {
        return $user->hasPermission('assets', 'delete');
    }
}

