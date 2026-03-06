<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Rename legacy singular table to Laravel-conventional plural name.
        if (Schema::hasTable('workload') && ! Schema::hasTable('workloads')) {
            Schema::rename('workload', 'workloads');

            // Temporary compatibility alias for old code paths during rollout.
            DB::statement('CREATE VIEW workload AS SELECT * FROM workloads');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('workloads')) {
            DB::statement('DROP VIEW IF EXISTS workload');
            Schema::rename('workloads', 'workload');
        }
    }
};
