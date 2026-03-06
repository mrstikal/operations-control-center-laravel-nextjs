<?php

use App\Http\Controllers\Api\AssetCategoryController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\IncidentController;
use App\Http\Controllers\Api\MetadataController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationScheduleController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\TimeOffController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Debug routes – only in local/testing (see routes/debug.php)
if (app()->environment(['local', 'testing'])) {
    require __DIR__.'/debug.php';
}

// Public auth routes
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
if (config('frontend.auth.allow_public_registration', false)) {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
}

// Broadcasting auth endpoint
Route::post('/broadcasting/auth', function (Request $request) {
    return Broadcast::auth($request);
})->middleware('auth');

// Protected routes
Route::middleware(['auth', 'tenant-isolation', 'record-api-metrics'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/me/default-tenant', [AuthController::class, 'setDefaultTenant']);

    // Tenants (shared read endpoint for existing tenant filters)
    Route::get('/tenants', [TenantController::class, 'index']);

    // Tenant management (Superadmin only)
    Route::middleware('check-role:Superadmin')->prefix('/tenants/manage')->group(function () {
        Route::get('', [TenantController::class, 'managementIndex']);
        Route::post('', [TenantController::class, 'store']);
        Route::put('/{tenantId}', [TenantController::class, 'update']);
        Route::get('/{tenantId}/users-for-transfer', [TenantController::class, 'usersForTransfer']);
        Route::post('/{tenantId}/archive-with-transfer', [TenantController::class, 'archiveWithTransfer']);
        Route::delete('/{tenantId}', [TenantController::class, 'destroy']);
        Route::post('/{tenantId}/restore', [TenantController::class, 'restore']);
        Route::delete('/{tenantId}/hard-delete', [TenantController::class, 'hardDelete']);
    });

    // Users
    Route::get('/users/profile/me', [UserController::class, 'profile']);
    Route::put('/users/{user}/update-profile', [UserController::class, 'updateProfile']);

    Route::middleware('check-permission:users,view')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
    });

    Route::post('/users/{user}/assign-role', [UserController::class, 'assignRole'])
        ->middleware('check-permission:users,assign_role');
    Route::delete('/users/{user}/remove-role/{roleId}', [UserController::class, 'removeRole'])
        ->middleware('check-permission:users,assign_role');

    // -------------------------------------------------------------------------
    // Contracts
    // Convention: {contract}   = route model binding (active records)
    //             {contractId} = manual lookup (supports withTrashed)
    // -------------------------------------------------------------------------
    Route::middleware('check-permission:contracts,view')->group(function () {
        Route::get('/contracts', [ContractController::class, 'index']);
        Route::get('/contracts/{contractId}', [ContractController::class, 'show']);
        Route::get('/contracts/{contractId}/incidents', [ContractController::class, 'incidents']);
    });

    Route::post('/contracts', [ContractController::class, 'store'])
        ->middleware('check-permission:contracts,create');
    Route::post('/contracts/{contractId}/incidents', [ContractController::class, 'storeIncident'])
        ->middleware('check-permission:contracts,edit');
    Route::put('/contracts/{contract}', [ContractController::class, 'update'])
        ->middleware('check-permission:contracts,edit');
    Route::put('/contracts/{contractId}/incidents/{incidentId}', [ContractController::class, 'updateIncident'])
        ->middleware('check-permission:contracts,edit');
    Route::delete('/contracts/hard-delete/{id}', [ContractController::class, 'hardDelete'])
        ->middleware('check-permission:contracts,delete');

    Route::delete('/contracts/{contract}', [ContractController::class, 'destroy'])
        ->middleware('check-permission:contracts,delete');

    Route::post('/contracts/{contractId}/restore', [ContractController::class, 'restore'])
        ->middleware('check-permission:contracts,edit');

    Route::delete('/contracts/{contractId}/incidents/{incidentId}', [ContractController::class, 'destroyIncident'])
        ->middleware('check-permission:contracts,delete');

    Route::post('/contracts/{contract}/approve', [ContractController::class, 'approve'])
        ->middleware('check-permission:contracts,approve');
    Route::post('/contracts/{contract}/change-status', [ContractController::class, 'changeStatus'])
        ->middleware('check-permission:contracts,change_status');

    // -------------------------------------------------------------------------
    // Incidents
    // Convention: {incident}   = route model binding (active records)
    //             {incidentId} = manual lookup (supports withTrashed)
    // -------------------------------------------------------------------------
    Route::middleware('check-permission:incidents,view')->group(function () {
        Route::get('/incidents', [IncidentController::class, 'index']);
        Route::get('/incidents/{incidentId}', [IncidentController::class, 'show']);
    });

    Route::post('/incidents', [IncidentController::class, 'store'])
        ->middleware('check-permission:incidents,create');
    Route::put('/incidents/{incident}', [IncidentController::class, 'update'])
        ->middleware('check-permission:incidents,edit');
    Route::delete('/incidents/{incident}', [IncidentController::class, 'destroy'])
        ->middleware('check-permission:incidents,delete');
    Route::post('/incidents/{incidentId}/restore', [IncidentController::class, 'restore'])
        ->middleware('check-permission:incidents,edit');
    Route::delete('/incidents/{incidentId}/hard-delete', [IncidentController::class, 'hardDelete'])
        ->middleware('check-permission:incidents,delete');
    Route::post('/incidents/{incident}/escalate', [IncidentController::class, 'escalate'])
        ->middleware('check-permission:incidents,escalate');
    Route::post('/incidents/{incident}/close', [IncidentController::class, 'close'])
        ->middleware('check-permission:incidents,close');
    Route::get('/incidents/{incidentId}/timeline', [IncidentController::class, 'timeline'])
        ->middleware('check-permission:incidents,view');
    Route::get('/incidents/{incidentId}/assignments', [IncidentController::class, 'assignments'])
        ->middleware('check-permission:incidents,view');
    Route::get('/incidents/{incidentId}/escalations', [IncidentController::class, 'escalations'])
        ->middleware('check-permission:incidents,view');
    Route::get('/incidents/{incidentId}/comments', [IncidentController::class, 'comments'])
        ->middleware('check-permission:incidents,view');
    Route::post('/incidents/{incidentId}/comments', [IncidentController::class, 'addComment'])
        ->middleware('check-permission:incidents,comment');

    // -------------------------------------------------------------------------
    // Assets
    // Convention: {asset}   = route model binding (active records)
    //             {assetId} = manual lookup (supports withTrashed)
    // -------------------------------------------------------------------------
    Route::middleware('check-permission:assets,view')->group(function () {
        Route::get('/maintenance-logs', [AssetController::class, 'globalMaintenanceLogs']);
        Route::get('/maintenance-schedules', [AssetController::class, 'globalMaintenanceSchedules']);
        Route::get('/assets', [AssetController::class, 'index']);
        Route::get('/assets/{asset}', [AssetController::class, 'show']);
        Route::get('/assets/{asset}/audit-trail', [AssetController::class, 'auditTrail']);
        Route::get('/assets/{asset}/maintenance-logs', [AssetController::class, 'maintenanceLogs']);
        Route::get('/assets/{asset}/maintenance-schedules', [AssetController::class, 'maintenanceSchedules']);
        Route::get('/asset-categories', [AssetCategoryController::class, 'index']);
    });

    Route::post('/assets', [AssetController::class, 'store'])
        ->middleware('check-permission:assets,create');
    Route::put('/assets/{asset}', [AssetController::class, 'update'])
        ->middleware('check-permission:assets,edit');
    Route::delete('/assets/{asset}', [AssetController::class, 'destroy'])
        ->middleware('check-permission:assets,delete');
    Route::post('/assets/{assetId}/restore', [AssetController::class, 'restore'])
        ->middleware('check-permission:assets,delete');
    Route::delete('/assets/{assetId}/hard-delete', [AssetController::class, 'hardDelete'])
        ->middleware('check-permission:assets,delete');
    Route::post('/assets/{asset}/log-maintenance', [AssetController::class, 'logMaintenance'])
        ->middleware('check-permission:assets,log_maintenance');
    Route::post('/assets/{asset}/maintenance-logs', [AssetController::class, 'logMaintenance'])
        ->middleware('check-permission:assets,log_maintenance');
    Route::patch('/assets/{asset}/maintenance-logs/{maintenanceLog}', [AssetController::class, 'updateMaintenanceLog'])
        ->middleware('check-permission:assets,log_maintenance');
    Route::delete('/assets/{asset}/maintenance-logs/{maintenanceLog}', [AssetController::class, 'deleteMaintenanceLog'])
        ->middleware('check-permission:assets,log_maintenance');
    Route::post('/assets/{asset}/schedule-maintenance', [AssetController::class, 'scheduleMaintenance'])
        ->middleware('check-permission:assets,schedule_maintenance');
    Route::post('/assets/{asset}/maintenance-schedules', [AssetController::class, 'scheduleMaintenance'])
        ->middleware('check-permission:assets,schedule_maintenance');
    Route::patch('/assets/{asset}/maintenance-schedules/{maintenanceSchedule}', [AssetController::class, 'updateMaintenanceSchedule'])
        ->middleware('check-permission:assets,schedule_maintenance');
    Route::delete('/assets/{asset}/maintenance-schedules/{maintenanceSchedule}', [AssetController::class, 'deleteMaintenanceSchedule'])
        ->middleware('check-permission:assets,schedule_maintenance');
    Route::post('/assets/{asset}/retire', [AssetController::class, 'retire'])
        ->middleware('check-permission:assets,edit');
    Route::post('/assets/{asset}/dispose', [AssetController::class, 'dispose'])
        ->middleware('check-permission:assets,delete');
    Route::post('/assets/{asset}/transfer', [AssetController::class, 'transfer'])
        ->middleware('check-permission:assets,edit');
    Route::post('/assets/{asset}/reassign', [AssetController::class, 'reassign'])
        ->middleware('check-permission:assets,edit');

    // -------------------------------------------------------------------------
    // HR & Employees  (all manual lookup – no soft-delete route-model binding)
    // -------------------------------------------------------------------------
    Route::middleware('check-permission:hr,view_employees')->group(function () {
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::get('/employees/statistics', [EmployeeController::class, 'statistics']);
        Route::get('/employees/{employeeId}', [EmployeeController::class, 'show']);
    });

    Route::post('/employees', [EmployeeController::class, 'store'])
        ->middleware('check-permission:hr,manage_employees');
    Route::put('/employees/{employeeId}', [EmployeeController::class, 'update'])
        ->middleware('check-permission:hr,manage_employees');
    Route::delete('/employees/{employeeId}', [EmployeeController::class, 'destroy'])
        ->middleware('check-permission:hr,manage_employees');
    Route::post('/employees/{employeeId}/restore', [EmployeeController::class, 'restore'])
        ->middleware('check-permission:hr,manage_employees');
    Route::delete('/employees/{employeeId}/hard-delete', [EmployeeController::class, 'hardDelete'])
        ->middleware('check-permission:hr,manage_employees');

    // HR Departments
    Route::middleware('check-permission:hr,view_employees')->group(function () {
        Route::get('/departments', [DepartmentController::class, 'index']);
        Route::get('/departments/{departmentId}', [DepartmentController::class, 'show']);
    });

    Route::middleware('check-role:Superadmin')->group(function () {
        Route::post('/departments', [DepartmentController::class, 'store']);
        Route::put('/departments/{departmentId}', [DepartmentController::class, 'update']);
        Route::delete('/departments/{departmentId}', [DepartmentController::class, 'destroy']);

    });

    // -------------------------------------------------------------------------
    // Shifts  (all manual lookup)
    // -------------------------------------------------------------------------
    Route::middleware('check-permission:hr,view_employees')->group(function () {
        Route::get('/shifts', [ShiftController::class, 'index']);
        Route::get('/shifts/{shiftId}', [ShiftController::class, 'show']);
        Route::get('/employee-shifts', [ShiftController::class, 'employeeShifts']);
    });

    Route::middleware('check-permission:hr,manage_shifts')->group(function () {
        Route::post('/shifts', [ShiftController::class, 'store']);
        Route::put('/shifts/{shiftId}', [ShiftController::class, 'update']);
        Route::delete('/shifts/{shiftId}', [ShiftController::class, 'destroy']);
        Route::post('/shifts/{shiftId}/assign', [ShiftController::class, 'assignEmployees']);
        Route::delete('/employee-shifts/{assignmentId}', [ShiftController::class, 'removeEmployeeAssignment']);
    });

    // -------------------------------------------------------------------------
    // Time-off Requests  (all manual lookup)
    // -------------------------------------------------------------------------
    Route::get('/time-off', [TimeOffController::class, 'index']);
    Route::get('/time-off/statistics', [TimeOffController::class, 'statistics']);
    Route::get('/time-off/{timeOffRequestId}', [TimeOffController::class, 'show']);
    Route::post('/time-off', [TimeOffController::class, 'store']);
    Route::put('/time-off/{timeOffRequestId}', [TimeOffController::class, 'update']);
    Route::post('/time-off/{timeOffRequestId}/cancel', [TimeOffController::class, 'cancel']);
    Route::post('/time-off/{timeOffRequestId}/archive', [TimeOffController::class, 'archive']);
    Route::post('/time-off/{timeOffRequestId}/restore', [TimeOffController::class, 'restore']);

    Route::post('/time-off/{timeOffRequestId}/decide', [TimeOffController::class, 'decide'])
        ->middleware('check-permission:hr,approve_timeoff');

    // -------------------------------------------------------------------------
    // Notifications
    // -------------------------------------------------------------------------
    Route::middleware('check-permission:notifications,view')->group(function () {
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::get('/notifications/{id}', [NotificationController::class, 'show']);
        Route::post('/notifications/{id}/mark-read', [NotificationController::class, 'markRead']);
        Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    });

    // -------------------------------------------------------------------------
    // Notification Schedules
    // -------------------------------------------------------------------------
    Route::middleware('check-permission:notifications,manage_schedules')->group(function () {
        Route::get('/notification-schedules', [NotificationScheduleController::class, 'index']);
        Route::get('/notification-schedules/{id}', [NotificationScheduleController::class, 'show']);
        Route::post('/notification-schedules', [NotificationScheduleController::class, 'store']);
        Route::put('/notification-schedules/{id}', [NotificationScheduleController::class, 'update']);
        Route::delete('/notification-schedules/{id}', [NotificationScheduleController::class, 'destroy']);
    });

    // Search
    Route::get('/search', [SearchController::class, 'index']);

    // Metadata (values from database)
    Route::get('/metadata/hr', [MetadataController::class, 'hrMetadata']);
    Route::get('/metadata/departments', [MetadataController::class, 'departments']);
    Route::get('/metadata/positions', [MetadataController::class, 'positions']);

    // Dashboard
    Route::get('/dashboard/summary', [DashboardController::class, 'summary'])
        ->middleware(['check-permission:contracts,view', 'check-permission:incidents,view']);
    Route::get('/dashboard/feed', [DashboardController::class, 'feed'])
        ->middleware(['check-permission:contracts,view', 'check-permission:incidents,view']);
    Route::get('/dashboard/read-models', [DashboardController::class, 'readModels'])
        ->middleware(['check-permission:contracts,view', 'check-permission:incidents,view']);
});
