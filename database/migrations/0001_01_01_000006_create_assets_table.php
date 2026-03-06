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
        Schema::create('asset_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name')->index();
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'name']);
        });

        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('asset_categories')->cascadeOnDelete();
            $table->string('name')->index();
            $table->string('asset_tag')->unique()->index();
            $table->string('serial_number')->nullable()->unique();
            $table->text('description')->nullable();

            // Lokace
            $table->string('location')->nullable()->index();
            $table->string('department')->nullable();

            // Technické údaje
            $table->string('manufacturer')->nullable();
            $table->string('model')->nullable();
            $table->date('acquisition_date')->nullable();
            $table->date('warranty_expiry')->nullable();

            // Stav
            $table->enum('status', ['operational', 'maintenance', 'repair', 'retired', 'disposed'])
                ->default('operational')
                ->index();
            $table->decimal('utilization_percent', 5, 2)->default(0);

            // Údržba
            $table->dateTime('last_maintenance')->nullable();
            $table->dateTime('next_maintenance')->nullable()->index();
            $table->integer('maintenance_interval_days')->nullable();

            // Metadata
            $table->json('specifications')->nullable();
            $table->json('custom_fields')->nullable();
            $table->json('documents')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('maintenance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->foreignId('performed_by')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['preventive', 'corrective', 'inspection', 'repair'])->index();
            $table->text('description');
            $table->decimal('hours_spent', 5, 2)->nullable();
            $table->decimal('cost', 12, 2)->nullable();
            $table->dateTime('performed_at');
            $table->text('notes')->nullable();
            $table->json('parts_replaced')->nullable();
            $table->timestamps();
            $table->index(['asset_id', 'performed_at']);
        });

        Schema::create('maintenance_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])->index();
            $table->integer('interval_days')->nullable();
            $table->text('description');
            $table->dateTime('next_due_date')->index();
            $table->boolean('is_active')->default(true)->index();
            $table->json('notification_settings')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('asset_audit_trail', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('assets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('action'); // created, updated, status_changed, maintenance_logged
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('reason')->nullable();
            $table->timestamp('action_at');
            $table->timestamps();
            $table->index(['asset_id', 'action_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_audit_trail');
        Schema::dropIfExists('maintenance_schedules');
        Schema::dropIfExists('maintenance_logs');
        Schema::dropIfExists('assets');
        Schema::dropIfExists('asset_categories');
    }
};
