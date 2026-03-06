<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Debug Routes  (local + testing only)
|--------------------------------------------------------------------------
|
| Loaded exclusively in local and testing environments via routes/api.php.
| Never register production-sensitive information here.
|
*/

Route::get('/_debug/auth', function () {
    return response()->json([
        'authorization' => request()->header('authorization'),
        'has_bearer' => request()->bearerToken() !== null,
        'bearer_prefix' => request()->bearerToken()
            ? substr(request()->bearerToken(), 0, 10).'...'
            : null,
    ]);
});
