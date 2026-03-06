<?php

use App\Services\Tenancy\TenantAccessService;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The required callback is used to authenticate
| the user and determine if they can listen to a given channel.
|
*/

// Contract channel - tenant members can listen
Broadcast::channel('tenant.{tenantId}.contracts', function ($user, $tenantId) {
    return app(TenantAccessService::class)->userCanAccessTenant($user, (int) $tenantId);
});

// Incident channel - tenant members can listen
Broadcast::channel('tenant.{tenantId}.incidents', function ($user, $tenantId) {
    return app(TenantAccessService::class)->userCanAccessTenant($user, (int) $tenantId);
});

// Asset channel - tenant members can listen
Broadcast::channel('tenant.{tenantId}.assets', function ($user, $tenantId) {
    return app(TenantAccessService::class)->userCanAccessTenant($user, (int) $tenantId);
});

// Alert channel - tenant members can listen
Broadcast::channel('tenant.{tenantId}.alerts', function ($user, $tenantId) {
    return app(TenantAccessService::class)->userCanAccessTenant($user, (int) $tenantId);
});

// Dashboard channel - tenant members can listen
Broadcast::channel('tenant.{tenantId}.dashboard', function ($user, $tenantId) {
    return app(TenantAccessService::class)->userCanAccessTenant($user, (int) $tenantId);
});

// User notification channel - individual user
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Admin channel - only admins
Broadcast::channel('tenant.{tenantId}.admin', function ($user, $tenantId) {
    return app(TenantAccessService::class)->userCanAccessTenant($user, (int) $tenantId) && $user->isAdmin();
});
