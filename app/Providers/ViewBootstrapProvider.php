<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\View\ViewServiceProvider;

class ViewBootstrapProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     * This runs BEFORE other service providers, ensuring View is available early
     */
    public function boot(): void
    {
        // View service will be available to RoutingServiceProvider
    }

    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register View service BEFORE RoutingServiceProvider initializes
        // This is the critical step - must happen in register() phase
        if (! $this->app->bound('view')) {
            $this->app->register(ViewServiceProvider::class);
        }
    }
}
