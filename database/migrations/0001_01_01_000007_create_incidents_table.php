<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('incident_number')->unique()->index();
            $table->string('title');
            $table->text('description');

            // Kategorisace
            $table->string('category')->index();
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])
                ->default('medium')
                ->index();
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])
                ->default('medium')
                ->index();
            $table->enum('status', ['open', 'in_progress', 'escalated', 'resolved', 'closed'])
                ->default('open')
                ->index();

            // Přiřazení
            $table->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('escalated_to')->nullable()->constrained('users')->nullOnDelete();

            // Vztahy
            $table->foreignId('contract_id')->nullable()->constrained('contracts')->nullOnDelete();
            $table->foreignId('asset_id')->nullable()->constrained('assets')->nullOnDelete();

            // Časové údaje
            $table->timestamp('reported_at');
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();

            // SLA
            $table->integer('sla_response_minutes')->nullable();
            $table->integer('sla_resolution_minutes')->nullable();
            $table->dateTime('sla_response_deadline')->nullable()->index();
            $table->dateTime('sla_resolution_deadline')->nullable()->index();
            $table->boolean('sla_breached')->default(false)->index();

            // Metadata
            $table->json('tags')->nullable();
            $table->text('resolution_summary')->nullable();
            $table->json('custom_fields')->nullable();
            $table->integer('version')->default(1);

            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('incident_timeline', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_id')->constrained('incidents')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('event_type'); // status_changed, assigned, escalated, commented, note_added
            $table->text('message');
            $table->json('metadata')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['incident_id', 'occurred_at']);
        });

        Schema::create('incident_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_id')->constrained('incidents')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_by')->constrained('users')->cascadeOnDelete();
            $table->enum('role', ['primary', 'secondary', 'observer'])->default('primary');
            $table->text('assignment_reason')->nullable();
            $table->timestamp('assigned_at');
            $table->timestamp('unassigned_at')->nullable();
            $table->timestamps();
            $table->unique(['incident_id', 'user_id', 'role']);
            $table->index(['user_id', 'assigned_at']);
        });

        Schema::create('incident_escalations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_id')->constrained('incidents')->cascadeOnDelete();
            $table->foreignId('escalated_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('escalated_to')->constrained('users')->cascadeOnDelete();
            $table->enum('escalation_level', ['level_1', 'level_2', 'level_3', 'level_4'])->index();
            $table->text('reason');
            $table->text('notes')->nullable();
            $table->timestamp('escalated_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['incident_id', 'escalated_at']);
        });

        Schema::create('incident_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incident_id')->constrained('incidents')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('comment');
            $table->boolean('is_internal')->default(false)->index();
            $table->json('attachments')->nullable();
            $table->timestamp('commented_at');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['incident_id', 'commented_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incident_comments');
        Schema::dropIfExists('incident_escalations');
        Schema::dropIfExists('incident_assignments');
        Schema::dropIfExists('incident_timeline');
        Schema::dropIfExists('incidents');
    }
};

