<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('contract_status_histories', function (Blueprint $table) {
            $table->id();

            $table->foreignId('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();

            $table->text('reason')->nullable();
            $table->timestamp('changed_at')->nullable();

            $table->timestamps();

            $table->index(['contract_id', 'changed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contract_status_histories');
    }
};