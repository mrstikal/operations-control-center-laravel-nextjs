<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware pro ověření role
 *
 * Použití:
 * Route::get('/admin', [AdminController::class, 'index'])->middleware('check-role:admin,manager');
 */
class CheckRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, ?string $roles = null): Response
    {
        if (! auth()->check()) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $roles) {
            return $next($request);
        }

        if (auth()->user()->isSuperadmin()) {
            return $next($request);
        }

        $allowedRoles = explode(',', $roles);
        $userHasRole = false;

        foreach ($allowedRoles as $role) {
            if (auth()->user()->hasRole(trim($role))) {
                $userHasRole = true;
                break;
            }
        }

        if (! $userHasRole) {
            return response()->json(['message' => "Access denied. Required role(s): {$roles}"], 403);
        }

        return $next($request);
    }
}
