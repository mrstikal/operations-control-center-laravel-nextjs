<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Event Sourcing - pro výstavbu kompletní auditní historie
     */
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('event_type')->index(); // ContractCreated, ContractStatusChanged, etc.
            $table->string('aggregate_type')->index(); // Contract, Incident, Asset
            $table->unsignedBigInteger('aggregate_id')->index(); // ID kontraktu, incidentu, atd.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->json('payload');
            $table->json('metadata')->nullable();
            $table->string('correlation_id')->nullable()->index(); // Pro propojování souvisejících eventů
            $table->string('causation_id')->nullable()->index(); // Pro propojování kauzality

            $table->unsignedBigInteger('version')->index(); // Verze agregátu
            $table->timestamp('occurred_at')->index();
            $table->timestamps();

            $table->unique(['aggregate_type', 'aggregate_id', 'version']);
            $table->index(['tenant_id', 'event_type', 'occurred_at']);
        });

        Schema::create('event_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('aggregate_type')->index();
            $table->unsignedBigInteger('aggregate_id')->index();
            $table->unsignedBigInteger('version');
            $table->json('state');
            $table->timestamp('created_at');

            $table->unique(['aggregate_type', 'aggregate_id', 'version']);
        });

        Schema::create('event_projections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('projection_name')->index();
            $table->string('source_event_type')->index();
            $table->unsignedBigInteger('last_processed_event_id')->index();
            $table->unsignedBigInteger('last_processed_version');
            $table->json('projection_state')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->unique(['tenant_id', 'projection_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_projections');
        Schema::dropIfExists('event_snapshots');
        Schema::dropIfExists('events');
    }
};

