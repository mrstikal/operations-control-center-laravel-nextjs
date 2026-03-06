<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('contract_status_history')) {
            return;
        }

        if (! Schema::hasTable('contract_status_histories')) {
            return;
        }

        $singularHasFrom = Schema::hasColumn('contract_status_history', 'from_status');
        $singularHasTo = Schema::hasColumn('contract_status_history', 'to_status');
        $pluralHasFrom = Schema::hasColumn('contract_status_histories', 'from_status');
        $pluralHasTo = Schema::hasColumn('contract_status_histories', 'to_status');

        DB::table('contract_status_histories')
            ->orderBy('id')
            ->chunk(500, function ($rows) use ($singularHasFrom, $singularHasTo, $pluralHasFrom, $pluralHasTo) {
                foreach ($rows as $row) {
                    $exists = DB::table('contract_status_history')
                        ->where('id', $row->id)
                        ->exists();

                    if ($exists) {
                        continue;
                    }

                    $payload = [
                        'id' => $row->id,
                        'contract_id' => $row->contract_id,
                        'old_status' => $row->old_status,
                        'new_status' => $row->new_status,
                        'changed_by' => $row->changed_by,
                        'reason' => $row->reason,
                        'changed_at' => $row->changed_at,
                        'created_at' => $row->created_at ?? now(),
                        'updated_at' => $row->updated_at ?? now(),
                    ];

                    if ($singularHasFrom) {
                        $payload['from_status'] = $pluralHasFrom ? $row->from_status : $row->old_status;
                    }

                    if ($singularHasTo) {
                        $payload['to_status'] = $pluralHasTo ? $row->to_status : $row->new_status;
                    }

                    DB::table('contract_status_history')->insert($payload);
                }
            });

        Schema::dropIfExists('contract_status_histories');
    }

    public function down(): void
    {
        if (Schema::hasTable('contract_status_histories') || ! Schema::hasTable('contract_status_history')) {
            return;
        }

        Schema::create('contract_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->string('old_status')->nullable();
            $table->string('new_status');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->timestamp('changed_at')->nullable();
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->timestamps();
            $table->index(['contract_id', 'changed_at']);
        });

        DB::table('contract_status_history')
            ->orderBy('id')
            ->chunk(500, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('contract_status_histories')->insert([
                        'id' => $row->id,
                        'contract_id' => $row->contract_id,
                        'old_status' => $row->old_status,
                        'new_status' => $row->new_status,
                        'changed_by' => $row->changed_by,
                        'reason' => $row->reason,
                        'changed_at' => $row->changed_at,
                        'from_status' => $row->from_status ?? $row->old_status,
                        'to_status' => $row->to_status ?? $row->new_status,
                        'created_at' => $row->created_at ?? now(),
                        'updated_at' => $row->updated_at ?? now(),
                    ]);
                }
            });
    }
};
