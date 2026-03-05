<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Http\Request;

// Broadcasting auth endpoint
Route::post('/broadcasting/auth', function (Request $request) {
    return Broadcast::auth();
})->middleware(['auth:sanctum']);

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);
    Route::get('/me', [\App\Http\Controllers\Api\AuthController::class, 'me']);

    // User profile
    Route::get('/users/profile/me', [UserController::class, 'profile']);
    Route::put('/users/{user}/update-profile', [UserController::class, 'updateProfile']);

    // Users Management
    Route::group(['middleware' => 'check-permission:users,view'], function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
    });

    // Assign/Remove Roles
    Route::post('/users/{user}/assign-role', [UserController::class, 'assignRole'])
        ->middleware('check-permission:users,assign_role');
    Route::delete('/users/{user}/remove-role/{roleId}', [UserController::class, 'removeRole'])
        ->middleware('check-permission:users,assign_role');

    // Contracts
    Route::group(['middleware' => 'check-permission:contracts,view'], function () {
        Route::get('/contracts', [ContractController::class, 'index']);
        Route::get('/contracts/{contract}', [ContractController::class, 'show']);
    });

    Route::post('/contracts', [ContractController::class, 'store'])
        ->middleware('check-permission:contracts,create');
    Route::put('/contracts/{contract}', [ContractController::class, 'update'])
        ->middleware('check-permission:contracts,edit');
    Route::delete('/contracts/{contract}', [ContractController::class, 'destroy'])
        ->middleware('check-permission:contracts,delete');

    // Contract actions
    Route::post('/contracts/{contract}/approve', [ContractController::class, 'approve'])
        ->middleware('check-permission:contracts,approve');
    Route::post('/contracts/{contract}/change-status', [ContractController::class, 'changeStatus'])
        ->middleware('check-permission:contracts,change_status');

    // Incidents
    Route::group(['middleware' => 'check-permission:incidents,view'], function () {
        Route::get('/incidents', [IncidentController::class, 'index']);
        Route::get('/incidents/{incident}', [IncidentController::class, 'show']);
    });

    Route::post('/incidents', [IncidentController::class, 'store'])
        ->middleware('check-permission:incidents,create');
    Route::put('/incidents/{incident}', [IncidentController::class, 'update'])
        ->middleware('check-permission:incidents,edit');
    Route::delete('/incidents/{incident}', [IncidentController::class, 'destroy'])
        ->middleware('check-permission:incidents,delete');

    // Incident actions
    Route::post('/incidents/{incident}/escalate', [IncidentController::class, 'escalate'])
        ->middleware('check-permission:incidents,escalate');
    Route::post('/incidents/{incident}/close', [IncidentController::class, 'close'])
        ->middleware('check-permission:incidents,close');

    // Assets
    Route::group(['middleware' => 'check-permission:assets,view'], function () {
        Route::get('/assets', [AssetController::class, 'index']);
        Route::get('/assets/{asset}', [AssetController::class, 'show']);
    });

    Route::post('/assets', [AssetController::class, 'store'])
        ->middleware('check-permission:assets,create');
    Route::put('/assets/{asset}', [AssetController::class, 'update'])
        ->middleware('check-permission:assets,edit');
    Route::delete('/assets/{asset}', [AssetController::class, 'destroy'])
        ->middleware('check-permission:assets,delete');

    // Asset maintenance
    Route::post('/assets/{asset}/log-maintenance', [AssetController::class, 'logMaintenance'])
        ->middleware('check-permission:assets,log_maintenance');
    Route::post('/assets/{asset}/schedule-maintenance', [AssetController::class, 'scheduleMaintenance'])
        ->middleware('check-permission:assets,schedule_maintenance');
});

