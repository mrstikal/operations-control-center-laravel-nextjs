<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // View service je registrován v ViewBootstrapProvider
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
