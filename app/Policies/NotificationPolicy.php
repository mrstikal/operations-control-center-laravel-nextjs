<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;

class NotificationPolicy extends BasePolicy
{
    /**
     * Determine if the user can list notifications (always own notifications).
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('notifications', 'view');
    }

    /**
     * Determine if the user can view a specific notification.
     * Users can only view their own notifications; admins can view any within tenant.
     */
    public function view(User $user, Notification $notification): bool
    {
        if (! $this->belongsToTenant($user, $notification)) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $notification->user_id === $user->id && $user->hasPermission('notifications', 'view');
    }

    /**
     * Determine if the user can mark a notification as read.
     */
    public function markRead(User $user, Notification $notification): bool
    {
        if (! $this->belongsToTenant($user, $notification)) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $notification->user_id === $user->id;
    }

    /**
     * Determine if the user can manage notification schedules.
     */
    public function manageSchedules(User $user): bool
    {
        return $user->hasPermission('notifications', 'manage_schedules');
    }
}
