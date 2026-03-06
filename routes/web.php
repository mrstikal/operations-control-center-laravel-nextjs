<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Route;

// Broadcasting authentication
Broadcast::routes(['middleware' => ['auth']]);

Route::get('/', function () {
    // ...existing code...
});
