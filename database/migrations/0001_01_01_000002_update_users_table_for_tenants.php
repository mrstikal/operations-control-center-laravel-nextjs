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
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('tenant_id')
                ->after('id')
                ->constrained('tenants')
                ->cascadeOnDelete()
                ->index();

            $table->string('employee_id')->nullable()->after('name')->unique();
            $table->enum('role', ['admin', 'manager', 'technician', 'viewer'])->default('viewer')->index();
            $table->string('phone')->nullable();
            $table->text('bio')->nullable();
            $table->string('avatar_url')->nullable();
            $table->enum('status', ['active', 'inactive', 'on_leave'])->default('active')->index();
            $table->timestamp('last_login_at')->nullable();
            $table->json('preferences')->nullable();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeignIdFor('tenants');
            $table->dropColumn([
                'tenant_id',
                'employee_id',
                'role',
                'phone',
                'bio',
                'avatar_url',
                'status',
                'last_login_at',
                'preferences',
                'deleted_at',
            ]);
        });
    }
};

