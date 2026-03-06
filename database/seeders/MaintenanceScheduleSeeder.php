<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\MaintenanceSchedule;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class MaintenanceScheduleSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::where('status', 'active')
            ->orderBy('id')
            ->get();

        if ($tenants->isEmpty()) {
            return;
        }

        foreach ($tenants as $tenant) {
            $assets = Asset::where('tenant_id', $tenant->id)
                ->orderBy('id')
                ->limit(3)
                ->get();

            if ($assets->isEmpty()) {
                continue;
            }

            $rows = $this->buildSchedulesForAssets($assets);

            foreach ($rows as $row) {
                MaintenanceSchedule::query()->updateOrCreate(
                    [
                        'asset_id' => $row['asset_id'],
                        'description' => $row['description'],
                    ],
                    $row
                );
            }

            foreach ($assets as $asset) {
                $nextDue = MaintenanceSchedule::query()
                    ->where('asset_id', $asset->id)
                    ->where('is_active', true)
                    ->orderBy('next_due_date', 'asc')
                    ->value('next_due_date');

                $asset->update([
                    'next_maintenance' => $nextDue,
                ]);
            }
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Asset>  $assets
     * @return array<int, array<string, mixed>>
     */
    private function buildSchedulesForAssets($assets): array
    {
        $now = now();

        return $assets->values()->map(function (Asset $asset, int $index) use ($now): array {
            if ($index === 0) {
                return [
                    'asset_id' => $asset->id,
                    'frequency' => 'monthly',
                    'interval_days' => 30,
                    'description' => 'Monthly preventive maintenance (overdue)',
                    'next_due_date' => $now->copy()->subDays(3),
                    'is_active' => true,
                    'notification_settings' => ['days_before' => 7],
                    'due_state' => MaintenanceSchedule::DUE_STATE_OVERDUE,
                    'last_notified_at' => $now->copy()->subDay(),
                    'deleted_at' => null,
                ];
            }

            if ($index === 1) {
                return [
                    'asset_id' => $asset->id,
                    'frequency' => 'weekly',
                    'interval_days' => 7,
                    'description' => 'Weekly inspection (due soon)',
                    'next_due_date' => $now->copy()->addDays(2),
                    'is_active' => true,
                    'notification_settings' => ['days_before' => 5],
                    'due_state' => MaintenanceSchedule::DUE_STATE_DUE_SOON,
                    'last_notified_at' => null,
                    'deleted_at' => null,
                ];
            }

            return [
                'asset_id' => $asset->id,
                'frequency' => 'quarterly',
                'interval_days' => 90,
                'description' => 'Quarterly service (healthy)',
                'next_due_date' => $now->copy()->addDays(25),
                'is_active' => true,
                'notification_settings' => ['days_before' => 7],
                'due_state' => MaintenanceSchedule::DUE_STATE_OK,
                'last_notified_at' => null,
                'deleted_at' => null,
            ];
        })->all();
    }
}
