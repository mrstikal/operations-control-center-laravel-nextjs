<?php

namespace Database\Seeders;

use App\Models\Asset;
use App\Models\AssetAuditTrail;
use App\Models\User;
use Illuminate\Database\Seeder;

class AssetAuditTrailSeeder extends Seeder
{
    public function run(): void
    {
        // Seed audit trail for existing assets with realistic history
        $assets = Asset::with('tenant')->get();

        if ($assets->isEmpty()) {
            return;
        }

        foreach ($assets as $asset) {
            // Get users from the same tenant
            $users = User::where('tenant_id', $asset->tenant_id)->get();

            if ($users->isEmpty()) {
                continue;
            }

            // 1. Created event (always first)
            $creator = $users->random();
            AssetAuditTrail::create([
                'asset_id' => $asset->id,
                'user_id' => $creator->id,
                'action' => 'created',
                'old_values' => null,
                'new_values' => [
                    'name' => $asset->name,
                    'asset_tag' => $asset->asset_tag,
                    'status' => $asset->status,
                    'location' => $asset->location,
                ],
                'reason' => null,
                'action_at' => $asset->created_at ?? now()->subMonths(rand(6, 24)),
            ]);

            // 2. Random updates (0-3 per asset)
            $updateCount = rand(0, 3);
            for ($i = 0; $i < $updateCount; $i++) {
                $editor = $users->random();
                $daysAgo = rand(30, 180);

                AssetAuditTrail::create([
                    'asset_id' => $asset->id,
                    'user_id' => $editor->id,
                    'action' => 'updated',
                    'old_values' => [
                        'location' => $this->randomLocation(),
                        'utilization_percent' => rand(50, 90),
                    ],
                    'new_values' => [
                        'location' => $asset->location,
                        'utilization_percent' => rand(60, 95),
                    ],
                    'reason' => null,
                    'action_at' => now()->subDays($daysAgo),
                ]);
            }

            // 3. Status changes (only for assets currently in maintenance)
            if ($asset->status === 'maintenance') {
                $manager = $users->random();
                AssetAuditTrail::create([
                    'asset_id' => $asset->id,
                    'user_id' => $manager->id,
                    'action' => 'status_changed',
                    'old_values' => ['status' => 'operational'],
                    'new_values' => ['status' => 'maintenance'],
                    'reason' => 'Scheduled preventive maintenance required',
                    'action_at' => now()->subDays(rand(5, 15)),
                ]);
            }

            // 4. Maintenance logs (1-4 per asset)
            $maintenanceCount = rand(1, 4);
            for ($i = 0; $i < $maintenanceCount; $i++) {
                $technician = $users->random();
                $daysAgo = rand(15, 200);

                $maintenanceTypes = ['preventive', 'corrective', 'inspection', 'repair'];
                $type = $maintenanceTypes[array_rand($maintenanceTypes)];

                AssetAuditTrail::create([
                    'asset_id' => $asset->id,
                    'user_id' => $technician->id,
                    'action' => 'maintenance_logged',
                    'old_values' => null,
                    'new_values' => [
                        'type' => $type,
                        'description' => $this->getMaintenanceDescription($type),
                        'hours_spent' => rand(1, 8),
                        'cost' => rand(200, 2000),
                    ],
                    'reason' => null,
                    'action_at' => now()->subDays($daysAgo),
                ]);
            }

            // 5. Maintenance scheduling (0-2 per asset)
            if (rand(0, 10) > 3) {
                $scheduler = $users->random();
                AssetAuditTrail::create([
                    'asset_id' => $asset->id,
                    'user_id' => $scheduler->id,
                    'action' => 'maintenance_scheduled',
                    'old_values' => null,
                    'new_values' => [
                        'frequency' => 'quarterly',
                        'interval_days' => 90,
                        'next_due_date' => now()->addDays(90)->toDateString(),
                    ],
                    'reason' => null,
                    'action_at' => now()->subDays(rand(60, 180)),
                ]);
            }

            // 6. Occasional soft delete + restore (5% chance)
            if (rand(0, 100) < 5 && ! $asset->deleted_at) {
                $deleter = $users->random();
                $restorer = $users->random();

                AssetAuditTrail::create([
                    'asset_id' => $asset->id,
                    'user_id' => $deleter->id,
                    'action' => 'deleted',
                    'old_values' => [
                        'status' => $asset->status,
                        'name' => $asset->name,
                    ],
                    'new_values' => null,
                    'reason' => 'Decommissioned temporarily for testing',
                    'action_at' => now()->subDays(rand(10, 30)),
                ]);

                AssetAuditTrail::create([
                    'asset_id' => $asset->id,
                    'user_id' => $restorer->id,
                    'action' => 'restored',
                    'old_values' => ['deleted_at' => true],
                    'new_values' => ['deleted_at' => false],
                    'reason' => 'Testing completed, asset returned to service',
                    'action_at' => now()->subDays(rand(5, 9)),
                ]);
            }
        }
    }

    private function randomLocation(): string
    {
        $locations = [
            'Downtown Office - Floor 3',
            'Data Center Hall A',
            'Factory Block C',
            'Hospital Wing B',
            'Airport Terminal East',
            'Campus Building 4',
            'Retail Location #7',
            'Municipal Office - Basement',
            'Warehouse North Dock',
        ];

        return $locations[array_rand($locations)];
    }

    private function getMaintenanceDescription(string $type): string
    {
        $descriptions = [
            'preventive' => [
                'Regular filter replacement and system check',
                'Quarterly preventive maintenance completed',
                'Annual service inspection performed',
                'Routine lubrication and calibration',
            ],
            'corrective' => [
                'Repaired faulty sensor unit',
                'Replaced worn belt drive',
                'Fixed cooling system leak',
                'Corrected control system error',
            ],
            'inspection' => [
                'Compliance inspection completed',
                'Safety inspection passed',
                'Visual inspection - no issues found',
                'Operational check performed',
            ],
            'repair' => [
                'Emergency repair completed',
                'Component replacement performed',
                'System restoration after failure',
                'Critical repair completed successfully',
            ],
        ];

        $pool = $descriptions[$type] ?? ['General maintenance performed'];

        return $pool[array_rand($pool)];
    }
}
