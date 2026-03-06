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
        if (! Schema::hasTable('workloads')) {
            return;
        }

        if (DB::getDriverName() !== 'pgsql') {
            DB::statement('DROP VIEW IF EXISTS workload');

            return;
        }

        $workloadViewExists = (bool) DB::table('pg_class')
            ->where('relname', 'workload')
            ->where('relkind', 'v')
            ->exists();

        if ($workloadViewExists) {
            DB::statement('DROP VIEW workload');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('workloads')) {
            return;
        }

        if (DB::getDriverName() !== 'pgsql') {
            DB::statement('CREATE VIEW IF NOT EXISTS workload AS SELECT * FROM workloads');

            return;
        }

        $workloadRelationExists = (bool) DB::table('pg_class')
            ->where('relname', 'workload')
            ->exists();

        if (! $workloadRelationExists) {
            DB::statement('CREATE VIEW workload AS SELECT * FROM workloads');
        }
    }
};
