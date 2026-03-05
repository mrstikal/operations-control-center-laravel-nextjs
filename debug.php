<?php
require 'bootstrap/app.php';

$user = \App\Models\User::where('email', 'admin@test.local')->first();

if ($user) {
    echo "✓ User Found: " . $user->name . "\n";
    echo "  Email: " . $user->email . "\n";
    echo "  Tenant ID: " . $user->tenant_id . "\n";
    echo "  Status: " . $user->status . "\n";
    echo "\n";

    $tenantId = $user->tenant_id;

    $contracts = \App\Models\Contract::where('tenant_id', $tenantId)->count();
    $incidents = \App\Models\Incident::where('tenant_id', $tenantId)->count();

    echo "Database Data:\n";
    echo "  Contracts: " . $contracts . "\n";
    echo "  Incidents: " . $incidents . "\n";
} else {
    echo "✗ User not found!\n";
}

