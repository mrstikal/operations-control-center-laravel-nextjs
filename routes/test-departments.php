<?php

use Illuminate\Support\Facades\Route;

Route::get('/test-departments', function () {
    $departments = \App\Models\Department::all();
    $profiles = \DB::table('employee_profiles')
        ->select('tenant_id', 'department', \DB::raw('count(*) as count'))
        ->whereNotNull('department')
        ->groupBy('tenant_id', 'department')
        ->get();

    return response()->json([
        'departments_count' => $departments->count(),
        'departments' => $departments,
        'employee_profiles_departments' => $profiles,
    ]);
});
