<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Centrální audit trail pro sledování všech změn
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            // Co se změnilo
            $table->string('model_type'); // User, Contract, Incident, Asset
            $table->unsignedBigInteger('model_id'); // ID modelu
            $table->string('event'); // created, updated, deleted, restored

            // Změny
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            // Kontext
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->string('url')->nullable();
            $table->string('method')->nullable(); // GET, POST, PUT, DELETE

            // Metadata
            $table->json('metadata')->nullable();

            $table->timestamp('created_at')->index();
            $table->index(['model_type', 'model_id']);
            $table->index(['tenant_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('action'); // viewed, created, updated, deleted, commented
            $table->string('subject_type')->nullable(); // Contract, Incident, etc.
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->text('description');

            $table->json('properties')->nullable();
            $table->string('ip_address')->nullable();

            $table->timestamp('created_at')->index();
            $table->index(['user_id', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('audit_logs');
    }
};
