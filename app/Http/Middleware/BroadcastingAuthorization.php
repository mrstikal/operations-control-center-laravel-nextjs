<?php

namespace App\Http\Middleware;

use App\Services\Tenancy\TenantAccessService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;

/**
 * Middleware for Broadcasting channel authorization.
 *
 * Verifies whether the user is authorized to subscribe to the given channel.
 */
class BroadcastingAuthorization
{
    public function __construct(private readonly TenantAccessService $tenantAccess) {}

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
        // Verify that the user is authenticated
        if (! auth()->check()) {
            abort(403, 'Unauthorized');
        }

        // Get channel name and user data
        $channelName = $request->input('channel_name');
        $user = auth()->user();

        // Parse channel name
        if (preg_match('/^tenant\.(\d+)\.(.+)$/', $channelName, $matches)) {
            $tenantId = (int) $matches[1];

            if (! $this->tenantAccess->userCanAccessTenant($user, $tenantId)) {
                abort(403, 'Not in this tenant');
            }
        }

        // User channel (private-user.X)
        if (preg_match('/^private-user\.(\d+)$/', $channelName, $matches)) {
            $userId = (int) $matches[1];

            // User can only subscribe to their own channel
            if ($user->id !== $userId) {
                abort(403, 'Not your channel');
            }
        }

        // OK, return auth response
        return Broadcast::auth($request);
    }
}
