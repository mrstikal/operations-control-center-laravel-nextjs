<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Incident;

class IncidentPolicy extends BasePolicy
{
    /**
     * Determine if the user can view the incident.
     */
    public function view(User $user, Incident $incident): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $incident)) {
            return false;
        }

        return $user->hasPermission('incidents', 'view');
    }

    /**
     * Determine if the user can create incidents.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('incidents', 'create');
    }

    /**
     * Determine if the user can update the incident.
     */
    public function update(User $user, Incident $incident): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $incident)) {
            return false;
        }

        return $user->hasPermission('incidents', 'edit');
    }

    /**
     * Determine if the user can delete the incident.
     */
    public function delete(User $user, Incident $incident): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $incident)) {
            return false;
        }

        return $user->hasPermission('incidents', 'delete');
    }

    /**
     * Determine if the user can escalate the incident.
     */
    public function escalate(User $user, Incident $incident): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $incident)) {
            return false;
        }

        return $user->hasPermission('incidents', 'escalate');
    }

    /**
     * Determine if the user can close the incident.
     */
    public function close(User $user, Incident $incident): bool
    {
        // Tenant isolation
        if (!$this->sameTenantt($user, $incident)) {
            return false;
        }

        // Manager, Admin, or assigned user
        if ($incident->assigned_to === $user->id) {
            return $user->hasPermission('incidents', 'close');
        }

        return $user->hasPermission('incidents', 'close') && $this->hasRole($user, ['Manager', 'Admin', 'Superadmin']);
    }

    /**
     * Determine if the user can restore a soft-deleted incident.
     */
    public function restore(User $user, Incident $incident): bool
    {
        return $user->hasPermission('incidents', 'edit');
    }

    /**
     * Determine if the user can permanently delete an incident.
     */
    public function forceDelete(User $user, Incident $incident): bool
    {
        return $user->hasPermission('incidents', 'delete');
    }
}

