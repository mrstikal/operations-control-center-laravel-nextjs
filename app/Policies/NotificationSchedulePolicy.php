<?php

namespace App\Policies;

use App\Models\NotificationSchedule;
use App\Models\User;

class NotificationSchedulePolicy extends BasePolicy
{
    /**
     * Determine if the user can list notification schedules.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('notifications', 'manage_schedules');
    }

    /**
     * Determine if the user can view a specific notification schedule.
     */
    public function view(User $user, NotificationSchedule $schedule): bool
    {
        if (! $this->belongsToTenant($user, $schedule)) {
            return false;
        }

        return $user->hasPermission('notifications', 'manage_schedules');
    }

    /**
     * Determine if the user can create notification schedules.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('notifications', 'manage_schedules');
    }

    /**
     * Determine if the user can update a notification schedule.
     */
    public function update(User $user, NotificationSchedule $schedule): bool
    {
        if (! $this->belongsToTenant($user, $schedule)) {
            return false;
        }

        return $user->hasPermission('notifications', 'manage_schedules');
    }

    /**
     * Determine if the user can delete a notification schedule.
     */
    public function delete(User $user, NotificationSchedule $schedule): bool
    {
        if (! $this->belongsToTenant($user, $schedule)) {
            return false;
        }

        return $user->hasPermission('notifications', 'manage_schedules');
    }
}
