<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Middleware pro Broadcasting channel authorization
 *
 * Kontroluje zda je uživatel oprávněn se přihlásit na daný channel
 */
class BroadcastingAuthorization
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): mixed
    {
        if ($request->isMethod('post') && $request->path() === 'broadcasting/auth') {
            return $this->authorizeChannel($request);
        }

        return $next($request);
    }

    /**
     * Authorize the incoming channel subscription request.
     */
    protected function authorizeChannel(Request $request): mixed
    {
        // Ověřit že uživatel je autentifikován
        if (!auth()->check()) {
            abort(403, 'Unauthorized');
        }

        // Získat channel name a user data
        $channelName = $request->input('channel_name');
        $user = auth()->user();

        // Parsovat channel name
        if (preg_match('/^tenant\.(\d+)\.(.+)$/', $channelName, $matches)) {
            $tenantId = (int)$matches[1];

            // User musí být ze stejného tenanta
            if ($user->tenant_id !== $tenantId) {
                abort(403, 'Not in this tenant');
            }
        }

        // User channel (private-user.X)
        if (preg_match('/^private-user\.(\d+)$/', $channelName, $matches)) {
            $userId = (int)$matches[1];

            // Může se přihlásit jen na svůj channel
            if ($user->id !== $userId) {
                abort(403, 'Not your channel');
            }
        }

        // OK, vrátit auth response
        return broadcast_auth($user);
    }
}

