<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

/**
 * @deprecated This class is not used in Laravel 12.
 *
 * All middleware registration and aliases are configured in bootstrap/app.php
 * via the ->withMiddleware() callback. This file is kept only to prevent
 * auto-discovery issues with tools that still scan for it.
 *
 * Registered middleware aliases (see bootstrap/app.php):
 *  - auth                => App\Http\Middleware\Authenticate
 *  - check-permission    => App\Http\Middleware\CheckPermission
 *  - check-role          => App\Http\Middleware\CheckRole
 *  - tenant-isolation    => App\Http\Middleware\EnforceTenantIsolation
 */
class Kernel extends HttpKernel {}
