<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Optimistic locking pro concurrent updates
     */
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            // Přidáme sloupec pro optimistic locking pokud ještě neexistuje
            if (! Schema::hasColumn('contracts', 'updated_version')) {
                $table->bigInteger('updated_version')->default(1)->after('version');
            }
        });

        Schema::table('incidents', function (Blueprint $table) {
            if (! Schema::hasColumn('incidents', 'updated_version')) {
                $table->bigInteger('updated_version')->default(1)->after('version');
            }
        });

        Schema::table('assets', function (Blueprint $table) {
            if (! Schema::hasColumn('assets', 'updated_version')) {
                $table->bigInteger('updated_version')->default(1)->after('updated_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table) {
            if (Schema::hasColumn('contracts', 'updated_version')) {
                $table->dropColumn('updated_version');
            }
        });

        Schema::table('incidents', function (Blueprint $table) {
            if (Schema::hasColumn('incidents', 'updated_version')) {
                $table->dropColumn('updated_version');
            }
        });

        Schema::table('assets', function (Blueprint $table) {
            if (Schema::hasColumn('assets', 'updated_version')) {
                $table->dropColumn('updated_version');
            }
        });
    }
};
