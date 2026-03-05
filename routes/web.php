<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome');

Route::get('/{path?}', function () {
    return view('welcome');
})->where('path', '^(?!api).*$');
