<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('contract_status_history')) {
            return;
        }

        Schema::table('contract_status_history', function (Blueprint $table) {
            if (! Schema::hasColumn('contract_status_history', 'from_status')) {
                $table->string('from_status')->nullable()->after('old_status');
            }

            if (! Schema::hasColumn('contract_status_history', 'to_status')) {
                $table->string('to_status')->nullable()->after('new_status');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('contract_status_history')) {
            return;
        }

        Schema::table('contract_status_history', function (Blueprint $table) {
            if (Schema::hasColumn('contract_status_history', 'from_status')) {
                $table->dropColumn('from_status');
            }

            if (Schema::hasColumn('contract_status_history', 'to_status')) {
                $table->dropColumn('to_status');
            }
        });
    }
};
