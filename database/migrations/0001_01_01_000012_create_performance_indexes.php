<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Performance indexes a optimalizace pro high-traffic queries
     */
    public function up(): void
    {
        // Contracts - optimalizace pro filtering a sorting
        Schema::table('contracts', function (Blueprint $table) {
            $table->index(['tenant_id', 'status', 'updated_at']);
            $table->index(['tenant_id', 'priority', 'status']);
            $table->index(['tenant_id', 'due_date', 'sla_status']);
            $table->index(['assigned_to', 'status']);
            $table->fullText(['title', 'description'])->after('description');
        });

        // Incidents - optimalizace pro realtime dashboard
        Schema::table('incidents', function (Blueprint $table) {
            $table->index(['tenant_id', 'status', 'severity']);
            $table->index(['tenant_id', 'priority', 'reported_at']);
            $table->index(['assigned_to', 'status']);
            $table->index(['sla_response_deadline', 'sla_breached']);
            $table->index(['sla_resolution_deadline', 'sla_breached']);
            $table->fullText(['title', 'description'])->after('description');
        });

        // Assets - optimalizace pro tracking a maintenance
        Schema::table('assets', function (Blueprint $table) {
            $table->index(['tenant_id', 'status', 'next_maintenance']);
            $table->index(['category_id', 'status']);
            $table->index(['tenant_id', 'department']);
            $table->index(['next_maintenance', 'status']);
            $table->fullText(['name', 'description', 'serial_number'])->after('serial_number');
        });

        // Employees - optimalizace pro scheduling a workload
        Schema::table('employee_profiles', function (Blueprint $table) {
            $table->index(['tenant_id', 'availability_status']);
            $table->index(['tenant_id', 'department']);
            $table->index(['availability_until', 'availability_status']);
        });

        // Events - optimalizace pro event sourcing
        Schema::table('events', function (Blueprint $table) {
            $table->index(['aggregate_type', 'aggregate_id', 'occurred_at']);
            $table->index(['correlation_id', 'occurred_at']);
            $table->index(['tenant_id', 'occurred_at']);
        });

        // Notifications - optimalizace pro unread queries
        Schema::table('notifications', function (Blueprint $table) {
            $table->index(['user_id', 'read', 'created_at']);
            $table->index(['tenant_id', 'read', 'created_at']);
        });

        // Activity logs - optimalizace pro audit trail
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->index(['tenant_id', 'user_id', 'created_at']);
            $table->index(['subject_type', 'subject_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Pomocí ifExists pro bezpečnost
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

