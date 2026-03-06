<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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
                ->cascadeOnDelete();

            $table->string('employee_id')->nullable()->after('name')->unique();
            $table->enum('role', ['superadmin', 'admin', 'manager', 'technician', 'viewer'])->default('viewer')->index();
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
        // PostgreSQL: shazuj FK/columns bezpečně (rollback musí být idempotentní)
        if (DB::getDriverName() === 'pgsql') {
            if (Schema::hasTable('users')) {
                // FK constraint může/nemusí existovat (nebo může mít jiné jméno) -> IF EXISTS
                DB::statement('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_tenant_id_foreign"');

                // drop sloupců pouze pokud existují
                if (Schema::hasColumn('users', 'tenant_id')) {
                    Schema::table('users', function (Blueprint $table) {
                        $table->dropColumn('tenant_id');
                    });
                }

                $columns = [
                    'employee_id',
                    'role',
                    'phone',
                    'bio',
                    'avatar_url',
                    'status',
                    'last_login_at',
                    'preferences',
                    'deleted_at',
                ];

                $existing = array_values(array_filter($columns, fn ($c) => Schema::hasColumn('users', $c)));

                if (! empty($existing)) {
                    Schema::table('users', function (Blueprint $table) use ($existing) {
                        $table->dropColumn($existing);
                    });
                }
            }

            return;
        }

        // Ostatní DB: původní chování
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('tenant_id');

            $table->dropColumn([
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
