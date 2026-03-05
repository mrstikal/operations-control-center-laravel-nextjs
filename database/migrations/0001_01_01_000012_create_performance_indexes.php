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
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // PostgreSQL/MySQL specific indexing
        // ... for production databases only
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // PostgreSQL: rollback musí být bezpečný i když indexy nikdy nevznikly (up() je zatím prázdné).
        if (DB::getDriverName() === 'pgsql') {
            $dropIndexIfExists = static function (string $indexName): void {
                DB::statement(sprintf('DROP INDEX IF EXISTS "%s"', $indexName));
            };

            // contracts
            $dropIndexIfExists('contracts_tenant_id_status_updated_at_index');
            $dropIndexIfExists('contracts_tenant_id_priority_status_index');
            $dropIndexIfExists('contracts_tenant_id_due_date_sla_status_index');
            $dropIndexIfExists('contracts_assigned_to_status_index');
            $dropIndexIfExists('contracts_title_description_fulltext');

            // incidents
            $dropIndexIfExists('incidents_tenant_id_status_severity_index');
            $dropIndexIfExists('incidents_tenant_id_priority_reported_at_index');
            $dropIndexIfExists('incidents_assigned_to_status_index');
            $dropIndexIfExists('incidents_sla_response_deadline_sla_breached_index');
            $dropIndexIfExists('incidents_sla_resolution_deadline_sla_breached_index');
            $dropIndexIfExists('incidents_title_description_fulltext');

            // assets
            $dropIndexIfExists('assets_tenant_id_status_next_maintenance_index');
            $dropIndexIfExists('assets_category_id_status_index');
            $dropIndexIfExists('assets_tenant_id_department_index');
            $dropIndexIfExists('assets_next_maintenance_status_index');
            $dropIndexIfExists('assets_name_description_serial_number_fulltext');

            // employee_profiles
            $dropIndexIfExists('employee_profiles_tenant_id_availability_status_index');
            $dropIndexIfExists('employee_profiles_tenant_id_department_index');
            $dropIndexIfExists('employee_profiles_availability_until_availability_status_index');

            // events
            $dropIndexIfExists('events_aggregate_type_aggregate_id_occurred_at_index');
            $dropIndexIfExists('events_correlation_id_occurred_at_index');
            $dropIndexIfExists('events_tenant_id_occurred_at_index');

            // notifications
            $dropIndexIfExists('notifications_user_id_read_created_at_index');
            $dropIndexIfExists('notifications_tenant_id_read_created_at_index');

            // activity_logs
            $dropIndexIfExists('activity_logs_tenant_id_user_id_created_at_index');
            $dropIndexIfExists('activity_logs_subject_type_subject_id_created_at_index');

            return;
        }

        // ... existing code ...
        // Ostatní DB (např. MySQL): původní chování
        Schema::table('contracts', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'status', 'updated_at']);
            $table->dropIndex(['tenant_id', 'priority', 'status']);
            $table->dropIndex(['tenant_id', 'due_date', 'sla_status']);
            $table->dropIndex(['assigned_to', 'status']);
            $table->dropFullText(['title', 'description']);
        });

        Schema::table('incidents', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'status', 'severity']);
            $table->dropIndex(['tenant_id', 'priority', 'reported_at']);
            $table->dropIndex(['assigned_to', 'status']);
            $table->dropIndex(['sla_response_deadline', 'sla_breached']);
            $table->dropIndex(['sla_resolution_deadline', 'sla_breached']);
            $table->dropFullText(['title', 'description']);
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'status', 'next_maintenance']);
            $table->dropIndex(['category_id', 'status']);
            $table->dropIndex(['tenant_id', 'department']);
            $table->dropIndex(['next_maintenance', 'status']);
            $table->dropFullText(['name', 'description', 'serial_number']);
        });

        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'availability_status']);
            $table->dropIndex(['tenant_id', 'department']);
            $table->dropIndex(['availability_until', 'availability_status']);
        });

        Schema::table('events', function (Blueprint $table) {
            $table->dropIndex(['aggregate_type', 'aggregate_id', 'occurred_at']);
            $table->dropIndex(['correlation_id', 'occurred_at']);
            $table->dropIndex(['tenant_id', 'occurred_at']);
        });

        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'read', 'created_at']);
            $table->dropIndex(['tenant_id', 'read', 'created_at']);
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'user_id', 'created_at']);
            $table->dropIndex(['subject_type', 'subject_id', 'created_at']);
        });
    }
};

