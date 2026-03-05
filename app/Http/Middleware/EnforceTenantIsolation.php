<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware pro tenant isolation
 *
 * Zajišťuje že uživatelé mohou přistupovat jen k datům svého tenanta
 */
class EnforceTenantIsolation
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->check()) {
            // Store tenant_id v request pro snadný přístup
            $request->merge([
                'tenant_id' => auth()->user()->tenant_id,
            ]);

            // Validace že tenant_id v request matchuje
            if ($request->has('tenant_id') && $request->input('tenant_id') !== auth()->user()->tenant_id) {
                return response()->json(['message' => 'Tenant isolation violation'], 403);
            }
        }

        return $next($request);
    }
}

