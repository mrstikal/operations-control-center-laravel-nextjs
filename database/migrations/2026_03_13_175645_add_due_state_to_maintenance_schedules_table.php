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
        Schema::table('maintenance_schedules', function (Blueprint $table) {
            $table->string('due_state')->default('ok')->after('is_active')->index();
            $table->dateTime('last_notified_at')->nullable()->after('due_state');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('maintenance_schedules', function (Blueprint $table) {
            $table->dropIndex(['due_state']);
            $table->dropColumn(['due_state', 'last_notified_at']);
        });
    }
};
