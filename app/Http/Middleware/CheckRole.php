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
    public function handle(Request $request, Closure $next, string $roles = null): Response
    {
        if (!auth()->check()) {
            abort(401, 'Unauthorized');
        }

        if (!$roles) {
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

        if (!$userHasRole) {
            abort(403, "Access denied. Required role(s): {$roles}");
        }

        return $next($request);
    }
}

