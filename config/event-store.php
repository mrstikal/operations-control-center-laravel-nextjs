<?php

return [
    'projections' => [
        'async' => env('EVENT_STORE_ASYNC_PROJECTIONS', false),
        'sync_fallback' => env('EVENT_STORE_SYNC_FALLBACK', true),
        'connection' => env('EVENT_STORE_PROJECTION_CONNECTION'),
        'queue' => env('EVENT_STORE_PROJECTION_QUEUE', 'event-projections'),
    ],
];
