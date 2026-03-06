<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Performance indexes a optimalizace pro high-traffic queries
     */
    public function up(): void
    {
        // Pro SQLite přeskočit - indexy jsou již v create tabulkách
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            return;
        }

        if ($driver === 'pgsql') {
            DB::statement('CREATE INDEX IF NOT EXISTS contracts_tenant_id_status_updated_at_index ON contracts (tenant_id, status, updated_at)');
            DB::statement('CREATE INDEX IF NOT EXISTS contracts_tenant_id_due_date_sla_status_index ON contracts (tenant_id, due_date, sla_status)');
            DB::statement('CREATE INDEX IF NOT EXISTS contracts_assigned_to_status_index ON contracts (assigned_to, status)');

            DB::statement('CREATE INDEX IF NOT EXISTS incidents_tenant_id_status_severity_index ON incidents (tenant_id, status, severity)');
            DB::statement('CREATE INDEX IF NOT EXISTS incidents_tenant_id_priority_reported_at_index ON incidents (tenant_id, priority, reported_at)');
            DB::statement('CREATE INDEX IF NOT EXISTS incidents_assigned_to_status_index ON incidents (assigned_to, status)');
            DB::statement('CREATE INDEX IF NOT EXISTS incidents_sla_resolution_deadline_sla_breached_index ON incidents (sla_resolution_deadline, sla_breached)');

            DB::statement('CREATE INDEX IF NOT EXISTS assets_tenant_id_status_next_maintenance_index ON assets (tenant_id, status, next_maintenance)');
            DB::statement('CREATE INDEX IF NOT EXISTS assets_category_id_status_index ON assets (category_id, status)');
            DB::statement('CREATE INDEX IF NOT EXISTS assets_tenant_id_department_index ON assets (tenant_id, department)');
            DB::statement('CREATE INDEX IF NOT EXISTS assets_next_maintenance_status_index ON assets (next_maintenance, status)');

            DB::statement('CREATE INDEX IF NOT EXISTS employee_profiles_availability_until_availability_status_index ON employee_profiles (availability_until, availability_status)');

            DB::statement('CREATE INDEX IF NOT EXISTS events_aggregate_type_aggregate_id_occurred_at_index ON events (aggregate_type, aggregate_id, occurred_at)');
            DB::statement('CREATE INDEX IF NOT EXISTS events_correlation_id_occurred_at_index ON events (correlation_id, occurred_at)');
            DB::statement('CREATE INDEX IF NOT EXISTS events_tenant_id_occurred_at_index ON events (tenant_id, occurred_at)');

            DB::statement('CREATE INDEX IF NOT EXISTS notifications_tenant_id_read_created_at_index ON notifications (tenant_id, read, created_at)');

            if (Schema::hasTable('activity_logs')) {
                DB::statement('CREATE INDEX IF NOT EXISTS activity_logs_tenant_id_user_id_created_at_index ON activity_logs (tenant_id, user_id, created_at)');
                DB::statement('CREATE INDEX IF NOT EXISTS activity_logs_subject_type_subject_id_created_at_index ON activity_logs (subject_type, subject_id, created_at)');
            }

            return;
        }

        if (Schema::hasTable('contracts')) {
            Schema::table('contracts', function (Blueprint $table) {
                $table->index(['tenant_id', 'status', 'updated_at'], 'contracts_tenant_id_status_updated_at_index');
                $table->index(['tenant_id', 'due_date', 'sla_status'], 'contracts_tenant_id_due_date_sla_status_index');
                $table->index(['assigned_to', 'status'], 'contracts_assigned_to_status_index');
            });
        }

        if (Schema::hasTable('incidents')) {
            Schema::table('incidents', function (Blueprint $table) {
                $table->index(['tenant_id', 'status', 'severity'], 'incidents_tenant_id_status_severity_index');
                $table->index(['tenant_id', 'priority', 'reported_at'], 'incidents_tenant_id_priority_reported_at_index');
                $table->index(['assigned_to', 'status'], 'incidents_assigned_to_status_index');
                $table->index(['sla_resolution_deadline', 'sla_breached'], 'incidents_sla_resolution_deadline_sla_breached_index');
            });
        }

        if (Schema::hasTable('assets')) {
            Schema::table('assets', function (Blueprint $table) {
                $table->index(['tenant_id', 'status', 'next_maintenance'], 'assets_tenant_id_status_next_maintenance_index');
                $table->index(['category_id', 'status'], 'assets_category_id_status_index');
                $table->index(['tenant_id', 'department'], 'assets_tenant_id_department_index');
                $table->index(['next_maintenance', 'status'], 'assets_next_maintenance_status_index');
            });
        }

        if (Schema::hasTable('employee_profiles')) {
            Schema::table('employee_profiles', function (Blueprint $table) {
                $table->index(['availability_until', 'availability_status'], 'employee_profiles_availability_until_availability_status_index');
            });
        }

        if (Schema::hasTable('events')) {
            Schema::table('events', function (Blueprint $table) {
                $table->index(['aggregate_type', 'aggregate_id', 'occurred_at'], 'events_aggregate_type_aggregate_id_occurred_at_index');
                $table->index(['correlation_id', 'occurred_at'], 'events_correlation_id_occurred_at_index');
                $table->index(['tenant_id', 'occurred_at'], 'events_tenant_id_occurred_at_index');
            });
        }

        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->index(['tenant_id', 'read', 'created_at'], 'notifications_tenant_id_read_created_at_index');
            });
        }

        if (Schema::hasTable('activity_logs')) {
            Schema::table('activity_logs', function (Blueprint $table) {
                $table->index(['tenant_id', 'user_id', 'created_at'], 'activity_logs_tenant_id_user_id_created_at_index');
                $table->index(['subject_type', 'subject_id', 'created_at'], 'activity_logs_subject_type_subject_id_created_at_index');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // PostgreSQL: rollback musí být bezpečný i když indexy nevznikly.
        if (DB::getDriverName() === 'pgsql') {
            $dropIndexIfExists = static function (string $indexName): void {
                DB::statement(sprintf('DROP INDEX IF EXISTS "%s"', $indexName));
            };

            // contracts
            $dropIndexIfExists('contracts_tenant_id_status_updated_at_index');
            $dropIndexIfExists('contracts_tenant_id_due_date_sla_status_index');
            $dropIndexIfExists('contracts_assigned_to_status_index');

            // incidents
            $dropIndexIfExists('incidents_tenant_id_status_severity_index');
            $dropIndexIfExists('incidents_tenant_id_priority_reported_at_index');
            $dropIndexIfExists('incidents_assigned_to_status_index');
            $dropIndexIfExists('incidents_sla_resolution_deadline_sla_breached_index');

            // assets
            $dropIndexIfExists('assets_tenant_id_status_next_maintenance_index');
            $dropIndexIfExists('assets_category_id_status_index');
            $dropIndexIfExists('assets_tenant_id_department_index');
            $dropIndexIfExists('assets_next_maintenance_status_index');

            // employee_profiles
            $dropIndexIfExists('employee_profiles_availability_until_availability_status_index');

            // events
            $dropIndexIfExists('events_aggregate_type_aggregate_id_occurred_at_index');
            $dropIndexIfExists('events_correlation_id_occurred_at_index');
            $dropIndexIfExists('events_tenant_id_occurred_at_index');

            // notifications
            $dropIndexIfExists('notifications_tenant_id_read_created_at_index');

            // activity_logs
            $dropIndexIfExists('activity_logs_tenant_id_user_id_created_at_index');
            $dropIndexIfExists('activity_logs_subject_type_subject_id_created_at_index');

            return;
        }

        if (Schema::hasTable('contracts')) {
            Schema::table('contracts', function (Blueprint $table) {
                $table->dropIndex('contracts_tenant_id_status_updated_at_index');
                $table->dropIndex('contracts_tenant_id_due_date_sla_status_index');
                $table->dropIndex('contracts_assigned_to_status_index');
            });
        }

        if (Schema::hasTable('incidents')) {
            Schema::table('incidents', function (Blueprint $table) {
                $table->dropIndex('incidents_tenant_id_status_severity_index');
                $table->dropIndex('incidents_tenant_id_priority_reported_at_index');
                $table->dropIndex('incidents_assigned_to_status_index');
                $table->dropIndex('incidents_sla_resolution_deadline_sla_breached_index');
            });
        }

        if (Schema::hasTable('assets')) {
            Schema::table('assets', function (Blueprint $table) {
                $table->dropIndex('assets_tenant_id_status_next_maintenance_index');
                $table->dropIndex('assets_category_id_status_index');
                $table->dropIndex('assets_tenant_id_department_index');
                $table->dropIndex('assets_next_maintenance_status_index');
            });
        }

        if (Schema::hasTable('employee_profiles')) {
            Schema::table('employee_profiles', function (Blueprint $table) {
                $table->dropIndex('employee_profiles_availability_until_availability_status_index');
            });
        }

        if (Schema::hasTable('events')) {
            Schema::table('events', function (Blueprint $table) {
                $table->dropIndex('events_aggregate_type_aggregate_id_occurred_at_index');
                $table->dropIndex('events_correlation_id_occurred_at_index');
                $table->dropIndex('events_tenant_id_occurred_at_index');
            });
        }

        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropIndex('notifications_tenant_id_read_created_at_index');
            });
        }

        if (Schema::hasTable('activity_logs')) {
            Schema::table('activity_logs', function (Blueprint $table) {
                $table->dropIndex('activity_logs_tenant_id_user_id_created_at_index');
                $table->dropIndex('activity_logs_subject_type_subject_id_created_at_index');
            });
        }
    }
};
