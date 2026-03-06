<?php

return [
    'auth' => [
        // Demo hardening: public registration is disabled unless explicitly enabled.
        'allow_public_registration' => env('ALLOW_PUBLIC_REGISTRATION', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Frontend Configuration
    |--------------------------------------------------------------------------
    |
    | Configure how the SPA frontend is served in different environments
    |
    */

    'frontend' => [
        // Development: Next.js dev server URL
        'dev_url' => env('FRONTEND_DEV_URL', 'http://localhost:3000'),

        // Production: serve from static export
        'static_path' => base_path('public/out'),

        // Mode: 'redirect', 'proxy', or 'static'
        'mode' => env('FRONTEND_MODE', app()->environment('local') ? 'redirect' : 'static'),
    ],
];
