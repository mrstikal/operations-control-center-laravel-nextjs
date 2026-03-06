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
        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('contract_number')->unique()->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('client_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();

            // Stavový automat: draft → approved → in_progress → blocked → done
            $table->enum('status', ['draft', 'approved', 'in_progress', 'blocked', 'done'])
                ->default('draft')
                ->index();
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])
                ->default('medium')
                ->index();

            // Časové údaje
            $table->dateTime('start_date')->nullable();
            $table->dateTime('due_date')->nullable();
            $table->dateTime('completed_at')->nullable();

            // SLA
            $table->integer('sla_hours')->nullable();
            $table->dateTime('sla_deadline')->nullable();
            $table->enum('sla_status', ['on_track', 'at_risk', 'breached'])->nullable()->index();

            // Finanční údaje
            $table->decimal('budget', 12, 2)->nullable();
            $table->decimal('spent', 12, 2)->default(0);

            // Metadata
            $table->json('tags')->nullable();
            $table->json('custom_fields')->nullable();
            $table->integer('version')->default(1);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('contract_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->enum('old_status', ['draft', 'approved', 'in_progress', 'blocked', 'done']);
            $table->enum('new_status', ['draft', 'approved', 'in_progress', 'blocked', 'done']);
            $table->foreignId('changed_by')->constrained('users')->cascadeOnDelete();
            $table->text('reason')->nullable();
            $table->timestamp('changed_at');
            $table->timestamps();
            $table->index(['contract_id', 'changed_at']);
        });

        Schema::create('contract_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->string('title');
            $table->text('description');
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->index();
            $table->enum('status', ['open', 'in_review', 'resolved', 'closed'])->default('open')->index();
            $table->foreignId('reported_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reported_at');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['contract_id', 'severity']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contract_incidents');
        Schema::dropIfExists('contract_status_history');
        Schema::dropIfExists('contracts');
    }
};
