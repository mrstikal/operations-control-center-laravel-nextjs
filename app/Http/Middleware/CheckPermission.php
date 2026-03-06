<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware pro ověření role/permission
 *
 * Použití:
 * Route::post('/contracts', [ContractController::class, 'store'])->middleware('check-permission:contracts,create');
 * Route::get('/admin', [AdminController::class, 'index'])->middleware('check-role:admin');
 */
class CheckPermission
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ?string $resource = null, ?string $action = null): Response
    {
        if (! auth()->check()) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $resource || ! $action) {
            return $next($request);
        }

        if (! auth()->user()->hasPermission($resource, $action)) {
            return response()->json(['message' => "Permission denied: {$resource}.{$action}"], 403);
        }

        return $next($request);
    }
}
