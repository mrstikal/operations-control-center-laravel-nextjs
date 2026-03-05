<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Contract;

class ContractPolicy extends BasePolicy
{
    /**
     * Determine if the user can view the contract.
     */
    public function view(User $user, Contract $contract): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $contract)) {
            return false;
        }

        // Everyone can view
        return $user->hasPermission('contracts', 'view');
    }

    /**
     * Determine if the user can create contracts.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('contracts', 'create');
    }

    /**
     * Determine if the user can update the contract.
     */
    public function update(User $user, Contract $contract): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $contract)) {
            return false;
        }

        // Can edit or is manager/admin
        return $user->hasPermission('contracts', 'edit');
    }

    /**
     * Determine if the user can delete the contract.
     */
    public function delete(User $user, Contract $contract): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $contract)) {
            return false;
        }

        // Only admins can delete
        return $user->hasPermission('contracts', 'delete');
    }

    /**
     * Determine if the user can approve contracts.
     */
    public function approve(User $user, Contract $contract): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $contract)) {
            return false;
        }

        // Only managers and admins
        return $user->hasPermission('contracts', 'approve');
    }

    /**
     * Determine if the user can change contract status.
     */
    public function changeStatus(User $user, Contract $contract): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $contract)) {
            return false;
        }

        // Managers and above, or assigned user can change status
        if ($contract->assigned_to === $user->id) {
            return $user->hasPermission('contracts', 'change_status');
        }

        return $user->hasPermission('contracts', 'change_status') && $this->hasRole($user, ['Manager', 'Admin', 'Superadmin']);
    }

    /**
     * Determine if the user can restore a soft-deleted contract.
     */
    public function restore(User $user, Contract $contract): bool
    {
        return $user->hasPermission('contracts', 'edit');
    }

    /**
     * Determine if the user can permanently delete a contract.
     */
    public function forceDelete(User $user, Contract $contract): bool
    {
        return $user->hasPermission('contracts', 'delete');
    }
}

