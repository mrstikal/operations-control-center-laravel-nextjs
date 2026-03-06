<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'role')) {
            return;
        }

        // Keep legacy role column in SQLite test environment for backward-compat tests.
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Restore legacy role column for rollback
            if (! Schema::hasColumn('users', 'role')) {
                $table->enum('role', ['superadmin', 'admin', 'manager', 'technician', 'viewer'])
                    ->default('viewer')
                    ->index()
                    ->after('status');
            }
        });
    }
};
