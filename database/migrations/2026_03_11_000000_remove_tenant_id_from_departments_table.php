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
        Schema::table('departments', function (Blueprint $table) {
            // Drop the unique constraint that includes tenant_id
            $table->dropUnique(['tenant_id', 'name']);
            // Drop the index that includes tenant_id
            $table->dropIndex(['tenant_id', 'is_active']);
            // Drop the foreign key and column
            $table->dropForeign(['tenant_id']);
            $table->dropColumn('tenant_id');

            // Add new unique constraint for just name
            $table->unique('name');
            // Add new index for is_active
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            // Drop the new constraints
            $table->dropUnique(['name']);
            $table->dropIndex(['is_active']);

            // Re-add tenant_id and its constraints
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unique(['tenant_id', 'name']);
            $table->index(['tenant_id', 'is_active']);
        });
    }
};
