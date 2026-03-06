<?php

namespace App\Providers;

use App\Models\Asset;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\Notification;
use App\Models\NotificationSchedule;
use App\Models\User;
use App\Policies\AssetPolicy;
use App\Policies\ContractPolicy;
use App\Policies\IncidentPolicy;
use App\Policies\NotificationPolicy;
use App\Policies\NotificationSchedulePolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Contract::class => ContractPolicy::class,
        Incident::class => IncidentPolicy::class,
        Asset::class => AssetPolicy::class,
        User::class => UserPolicy::class,
        Notification::class => NotificationPolicy::class,
        NotificationSchedule::class => NotificationSchedulePolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        Gate::before(function (User $user) {
            return $user->isSuperadmin() ? true : null;
        });

        // Define gates for granular access control

        // Admin gate - pro full access
        Gate::define('admin', function (User $user) {
            return $user->isAdmin();
        });

        // Manager gate
        Gate::define('manager', function (User $user) {
            return $user->hasRole('Manager') || $user->isAdmin();
        });

        // Technician gate
        Gate::define('technician', function (User $user) {
            return $user->hasRole('Technician') || $user->isAdmin();
        });

        // View-only gate
        Gate::define('viewer', function (User $user) {
            return true; // Everyone is at least a viewer
        });

        // Permission gates
        Gate::define('can-manage-users', function (User $user) {
            return $user->hasPermission('users', 'create');
        });

        Gate::define('can-manage-roles', function (User $user) {
            return $user->hasPermission('settings', 'manage_roles');
        });

        Gate::define('can-view-audit-logs', function (User $user) {
            return $user->hasPermission('system', 'view_audit_logs');
        });

        // Contract gates
        Gate::define('can-approve-contracts', function (User $user) {
            return $user->hasPermission('contracts', 'approve');
        });

        Gate::define('can-delete-contracts', function (User $user) {
            return $user->hasPermission('contracts', 'delete');
        });

        // Incident gates
        Gate::define('can-escalate-incidents', function (User $user) {
            return $user->hasPermission('incidents', 'escalate');
        });

        // HR gates
        Gate::define('can-approve-timeoff', function (User $user) {
            return $user->hasPermission('hr', 'approve_timeoff');
        });

        Gate::define('can-manage-shifts', function (User $user) {
            return $user->hasPermission('hr', 'manage_shifts');
        });
    }
}
