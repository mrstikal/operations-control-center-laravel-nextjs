<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Fulltext search indexing pro rychlé vyhledávání
     */
    public function up(): void
    {
        Schema::create('search_index', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();

            $table->string('indexable_type'); // Contract, Incident, Asset, User
            $table->unsignedBigInteger('indexable_id');

            $table->text('searchable_text'); // Fulltext search field
            $table->json('metadata')->nullable();

            $table->timestamp('indexed_at')->index();
            $table->timestamp('updated_at');

            $table->unique(['indexable_type', 'indexable_id']);
            $table->index(['tenant_id', 'indexable_type']);

            // Fulltext index pro MySQL/PostgreSQL (SQLite uses regular index)
            if (DB::getDriverName() !== 'sqlite') {
                $table->fullText('searchable_text');
            } else {
                $table->index('searchable_text');
            }
        });

        Schema::create('search_queries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->text('query');
            $table->integer('results_count')->default(0);
            $table->decimal('execution_time_ms', 8, 2)->nullable();

            $table->timestamp('searched_at')->index();
            $table->index(['tenant_id', 'searched_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('search_queries');
        Schema::dropIfExists('search_index');
    }
};
