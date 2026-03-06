<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Notifikace a alerts pro realtime dashboard
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();

            $table->string('type'); // sla_breach, maintenance_due, incident_assigned, etc.
            $table->string('title');
            $table->text('message');

            // Kontext
            $table->string('notifiable_type')->nullable();
            $table->unsignedBigInteger('notifiable_id')->nullable();

            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium')->index();
            $table->boolean('read')->default(false)->index();
            $table->timestamp('read_at')->nullable();

            // Akce
            $table->string('action_url')->nullable();
            $table->json('data')->nullable();

            $table->timestamp('created_at')->index();
            $table->index(['user_id', 'read', 'created_at']);
            $table->index(['tenant_id', 'type', 'created_at']);
        });

        Schema::create('notification_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name')->index();
            $table->string('notification_type');
            $table->string('trigger'); // sla_breach, maintenance_due, etc.
            $table->json('conditions')->nullable();
            $table->json('recipients')->nullable(); // role-based or user_ids
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->unique(['tenant_id', 'name']);
        });

        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();

            $table->string('alert_type')->index(); // sla_breach, high_utilization, maintenance_due
            $table->string('subject');
            $table->text('message');
            $table->enum('severity', ['info', 'warning', 'critical'])->default('warning')->index();
            $table->enum('status', ['active', 'acknowledged', 'resolved'])->default('active')->index();

            $table->string('source_type')->nullable(); // Contract, Asset, Incident
            $table->unsignedBigInteger('source_id')->nullable();

            $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamp('triggered_at');
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('resolved_at')->nullable();

            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->index(['tenant_id', 'status', 'severity']);
            $table->index(['source_type', 'source_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alerts');
        Schema::dropIfExists('notification_schedules');
        Schema::dropIfExists('notifications');
    }
};
