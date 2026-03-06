<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\MaintenanceLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class MaintenanceLogSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::where('status', 'active')
            ->orderBy('id')
            ->get();

        if ($tenants->isEmpty()) {
            return;
        }

        $globalFallbackUserId = User::query()->orderBy('id')->value('id');
        if ($globalFallbackUserId === null) {
            return;
        }

        foreach ($tenants as $tenant) {
            $performedBy = $this->resolveMaintenanceUserId((int) $tenant->id, (int) $globalFallbackUserId);

            $assets = Asset::where('tenant_id', $tenant->id)
                ->orderBy('id')
                ->limit(3)
                ->get();

            if ($assets->isEmpty()) {
                continue;
            }

            foreach ($assets as $asset) {
                $rows = $this->buildLogsForAsset($asset->id, $performedBy);

                foreach ($rows as $row) {
                    MaintenanceLog::query()->updateOrCreate(
                        [
                            'asset_id' => $row['asset_id'],
                            'type' => $row['type'],
                            'performed_at' => $row['performed_at'],
                        ],
                        $row
                    );
                }

                $latestPerformedAt = MaintenanceLog::query()
                    ->where('asset_id', $asset->id)
                    ->max('performed_at');

                if ($latestPerformedAt !== null) {
                    $asset->update([
                        'last_maintenance' => $latestPerformedAt,
                    ]);
                }
            }
        }
    }

    private function resolveMaintenanceUserId(int $tenantId, int $fallbackUserId): int
    {
        $tenantUserId = User::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('email', ['tech@test.local', 'manager@test.local', 'admin@test.local'])
            ->orderByRaw("CASE email WHEN 'tech@test.local' THEN 1 WHEN 'manager@test.local' THEN 2 ELSE 3 END")
            ->value('id');

        return $tenantUserId !== null ? (int) $tenantUserId : $fallbackUserId;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildLogsForAsset(int $assetId, int $performedBy): array
    {
        $now = now();

        return [
            [
                'asset_id' => $assetId,
                'performed_by' => $performedBy,
                'type' => 'inspection',
                'description' => 'Routine inspection completed, no critical issues found.',
                'hours_spent' => 1.5,
                'cost' => 120.00,
                'performed_at' => $now->copy()->subDays(35),
                'notes' => 'Visual checks and diagnostics passed.',
                'parts_replaced' => [],
            ],
            [
                'asset_id' => $assetId,
                'performed_by' => $performedBy,
                'type' => 'preventive',
                'description' => 'Preventive maintenance completed and consumables replaced.',
                'hours_spent' => 2.0,
                'cost' => 260.00,
                'performed_at' => $now->copy()->subDays(7),
                'notes' => 'Filters and lubricants replaced according to checklist.',
                'parts_replaced' => ['filter_kit', 'lubricant_pack'],
            ],
        ];
    }
}
