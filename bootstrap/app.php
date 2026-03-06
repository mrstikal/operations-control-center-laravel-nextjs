<?php

use App\Http\Middleware\Authenticate;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\EnforceTenantIsolation;
use App\Http\Middleware\RecordApiStatusMetrics;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$providers = array_merge(
    require __DIR__.'/providers.php',
    [
        \Illuminate\View\ViewServiceProvider::class,
    ],
);

$app = Application::configure(basePath: dirname(__DIR__))
    ->withProviders($providers)
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();

        $middleware->alias([
            'auth' => Authenticate::class,
            'check-permission' => CheckPermission::class,
            'check-role' => CheckRole::class,
            'tenant-isolation' => EnforceTenantIsolation::class,
            'record-api-metrics' => RecordApiStatusMetrics::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();

// Ensure 'env' exists even if something touches $app->environment() very early
if (! $app->bound('env')) {
    $app->instance('env', $_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? 'production');
}

// Minimal early bindings so exception rendering doesn't crash on missing services
$app->register(\Illuminate\Filesystem\FilesystemServiceProvider::class);
$app->register(\Illuminate\View\ViewServiceProvider::class);

return $app;
