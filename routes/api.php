<?php

use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\IncidentController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DashboardController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::get('/_debug/auth', function () {
    return response()->json([
        'authorization' => request()->header('authorization'),
        'has_bearer' => request()->bearerToken() !== null,
        'bearer_prefix' => request()->bearerToken()
            ? substr(request()->bearerToken(), 0, 10) . '...'
            : null,
    ]);
});

// Public auth routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Broadcasting auth endpoint
Route::post('/broadcasting/auth', function (Request $request) {
    return Broadcast::auth($request);
})->middleware('auth:sanctum');

// Protected routes
Route::middleware(['auth:sanctum', 'tenant-isolation'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', function (Request $request) {
            return response()->json([
                'success' => true,
                'data' => $request->user(),
            ]);
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

    // Contracts
    Route::middleware('check-permission:contracts,view')->group(function () {
        Route::get('/contracts', [ContractController::class, 'index']);
        Route::get('/contracts/{contract}', [ContractController::class, 'show']);
    });

    Route::post('/contracts', [ContractController::class, 'store'])
        ->middleware('check-permission:contracts,create');
    Route::put('/contracts/{contract}', [ContractController::class, 'update'])
        ->middleware('check-permission:contracts,edit');
    Route::delete('/contracts/{contract}', [ContractController::class, 'destroy'])
        ->middleware('check-permission:contracts,delete');
    Route::post('/contracts/{contract}/approve', [ContractController::class, 'approve'])
        ->middleware('check-permission:contracts,approve');
    Route::post('/contracts/{contract}/change-status', [ContractController::class, 'changeStatus'])
        ->middleware('check-permission:contracts,change_status');

    // Incidents
    Route::middleware('check-permission:incidents,view')->group(function () {
        Route::get('/incidents', [IncidentController::class, 'index']);
        Route::get('/incidents/{incident}', [IncidentController::class, 'show']);
    });

    Route::post('/incidents', [IncidentController::class, 'store'])
        ->middleware('check-permission:incidents,create');
    Route::put('/incidents/{incident}', [IncidentController::class, 'update'])
        ->middleware('check-permission:incidents,edit');
    Route::delete('/incidents/{incident}', [IncidentController::class, 'destroy'])
        ->middleware('check-permission:incidents,delete');
    Route::post('/incidents/{incident}/escalate', [IncidentController::class, 'escalate'])
        ->middleware('check-permission:incidents,escalate');
    Route::post('/incidents/{incident}/close', [IncidentController::class, 'close'])
        ->middleware('check-permission:incidents,close');

    // Assets
    Route::middleware('check-permission:assets,view')->group(function () {
        Route::get('/assets', [AssetController::class, 'index']);
        Route::get('/assets/{asset}', [AssetController::class, 'show']);
    });

    Route::post('/assets', [AssetController::class, 'store'])
        ->middleware('check-permission:assets,create');
    Route::put('/assets/{asset}', [AssetController::class, 'update'])
        ->middleware('check-permission:assets,edit');
    Route::delete('/assets/{asset}', [AssetController::class, 'destroy'])
        ->middleware('check-permission:assets,delete');
    Route::post('/assets/{asset}/log-maintenance', [AssetController::class, 'logMaintenance'])
        ->middleware('check-permission:assets,log_maintenance');
    Route::post('/assets/{asset}/schedule-maintenance', [AssetController::class, 'scheduleMaintenance'])
        ->middleware('check-permission:assets,schedule_maintenance');

    // Dashboard
    Route::get('/dashboard/summary', [DashboardController::class, 'summary'])
        ->middleware(['check-permission:contracts,view', 'check-permission:incidents,view']);
    Route::get('/dashboard/feed', [DashboardController::class, 'feed'])
        ->middleware(['check-permission:contracts,view', 'check-permission:incidents,view']);
});
