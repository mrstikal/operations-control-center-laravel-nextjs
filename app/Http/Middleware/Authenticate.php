<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as BaseAuthenticate;
use Illuminate\Http\Request;

class Authenticate extends BaseAuthenticate
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // For API requests, don't redirect - let the exception handler deal with it
        // which will return JSON 401 Unauthenticated
        if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*')) {
            return null;
        }

        return route('login');
    }

    /**
     * Handle an unauthenticated user.
     */
    protected function unauthenticated($request, array $guards)
    {
        // For API requests, throw a proper JSON exception
        if ($request->expectsJson() || $request->is('api/*')) {
            abort(401, 'Unauthenticated.');
        }

        // Otherwise use default behavior
        parent::unauthenticated($request, $guards);
    }
}

