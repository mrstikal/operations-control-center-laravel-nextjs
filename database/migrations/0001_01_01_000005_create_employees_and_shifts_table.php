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
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'name']);
            $table->index(['tenant_id', 'is_active']);
        });

        Schema::create('employee_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();

            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('position')->nullable();
            $table->date('hire_date')->nullable();

            // Kapacita a vytížení
            $table->integer('available_hours_per_week')->default(40);
            $table->decimal('utilization_percent', 5, 2)->default(0);

            // Dovednosti
            $table->json('skills')->nullable();
            $table->json('certifications')->nullable();

            // Dostupnost
            $table->enum('availability_status', ['available', 'on_leave', 'on_maintenance', 'unavailable'])
                ->default('available')
                ->index();
            $table->timestamp('availability_until')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index();
            $table->time('start_time');
            $table->time('end_time');
            $table->json('days_of_week'); // [1, 2, 3, 4, 5] = Mon-Fri
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->unique(['name']);
        });

        Schema::create('employee_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->foreignId('shift_id')->constrained('shifts')->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->index(['employee_id', 'start_date']);
        });

        Schema::create('time_off_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->dateTime('start_date');
            $table->dateTime('end_date');
            $table->enum('type', ['vacation', 'sick_leave', 'personal', 'other'])->index();
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending')->index();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->text('approval_note')->nullable();
            $table->timestamp('requested_at');
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'status']);
        });

        Schema::create('workload', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->date('work_date')->index();
            $table->decimal('hours_allocated', 5, 2)->default(0);
            $table->decimal('hours_actual', 5, 2)->nullable();
            $table->decimal('capacity_utilization', 5, 2)->default(0);
            $table->json('tasks')->nullable();
            $table->timestamps();
            $table->unique(['employee_id', 'work_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workload');
        Schema::dropIfExists('time_off_requests');
        Schema::dropIfExists('employee_shifts');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('employee_profiles');
        Schema::dropIfExists('departments');
    }
};
