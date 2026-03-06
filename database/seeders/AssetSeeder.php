<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AssetSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::where('status', 'active')
            ->orderBy('id')
            ->get();

        if ($tenants->isEmpty()) {
            return;
        }

        $primaryTenantId = $this->resolvePrimaryTenantId($tenants->pluck('id')->all());

        foreach ($tenants as $tenant) {
            $assignees = $this->resolveAssigneesForTenant($tenant);
            $categoryIds = $this->seedCategoriesForTenant($tenant);
            $assets = $this->buildAssetsForTenant($tenant, $categoryIds, $primaryTenantId !== null && $tenant->id === $primaryTenantId);

            foreach ($assets as $asset) {
                DB::table('assets')->updateOrInsert(
                    [
                        'tenant_id' => $asset['tenant_id'],
                        'asset_tag' => $asset['asset_tag'],
                    ],
                    [
                        'tenant_id' => $asset['tenant_id'],
                        'category_id' => $asset['category_id'],
                        'name' => $asset['name'],
                        'asset_tag' => $asset['asset_tag'],
                        'serial_number' => $asset['serial_number'],
                        'location' => $asset['location'],
                        'department' => $asset['department'],
                        'assigned_to' => $this->resolveDefaultAssigneeId($asset['department'] ?? null, $assignees),
                        'manufacturer' => $asset['manufacturer'],
                        'model' => $asset['model'],
                        'acquisition_date' => $asset['acquisition_date'],
                        'status' => $asset['status'],
                        'last_maintenance' => $asset['last_maintenance'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }

    /**
     * Keep legacy unprefixed asset identifiers attached to the tenant that already owns them.
     */
    private function resolvePrimaryTenantId(array $activeTenantIds): ?int
    {
        $existingTenantId = DB::table('assets')
            ->whereIn('asset_tag', array_column($this->assetTemplates(), 'asset_tag'))
            ->orderBy('tenant_id')
            ->value('tenant_id');

        if ($existingTenantId !== null) {
            return in_array((int) $existingTenantId, $activeTenantIds, true)
                ? (int) $existingTenantId
                : null;
        }

        return $activeTenantIds[0];
    }

    /**
     * Resolve per-tenant assignees from deterministic dashboard accounts where available.
     */
    private function resolveAssigneesForTenant(Tenant $tenant): array
    {
        $usersByEmail = User::where('tenant_id', $tenant->id)
            ->whereIn('email', ['admin@test.local', 'manager@test.local', 'tech@test.local'])
            ->get()
            ->keyBy('email');

        return [
            'admin' => $usersByEmail->get('admin@test.local')?->id,
            'manager' => $usersByEmail->get('manager@test.local')?->id,
            'technician' => $usersByEmail->get('tech@test.local')?->id,
            'fallback' => User::where('tenant_id', $tenant->id)->value('id'),
        ];
    }

    /**
     * Seed asset categories for a specific tenant and return their IDs keyed by category name.
     */
    private function seedCategoriesForTenant(Tenant $tenant): array
    {
        $categoryIds = [];

        foreach ($this->assetCategories() as $category) {
            $existing = DB::table('asset_categories')
                ->where('tenant_id', $tenant->id)
                ->where('name', $category['name'])
                ->first();

            if ($existing) {
                $categoryIds[$category['name']] = $existing->id;

                continue;
            }

            $categoryIds[$category['name']] = DB::table('asset_categories')->insertGetId([
                'tenant_id' => $tenant->id,
                'name' => $category['name'],
                'description' => $category['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $categoryIds;
    }

    /**
     * Build the tenant-scoped asset payloads from shared templates.
     */
    private function buildAssetsForTenant(Tenant $tenant, array $categoryIds, bool $keepBaseIdentifiers): array
    {
        return array_map(function (array $asset) use ($tenant, $categoryIds, $keepBaseIdentifiers) {
            return [
                'tenant_id' => $tenant->id,
                'category_id' => $categoryIds[$asset['category']],
                'name' => $asset['name'],
                'asset_tag' => $this->buildTenantScopedIdentifier($asset['asset_tag'], $tenant, $keepBaseIdentifiers),
                'serial_number' => $asset['serial_number']
                    ? $this->buildTenantScopedIdentifier($asset['serial_number'], $tenant, $keepBaseIdentifiers)
                    : null,
                'location' => $asset['location'],
                'department' => $asset['department'],
                'manufacturer' => $asset['manufacturer'],
                'model' => $asset['model'],
                'acquisition_date' => $asset['acquisition_date'],
                'status' => $asset['status'],
                'last_maintenance' => $asset['last_maintenance'],
            ];
        }, $this->assetTemplates());
    }

    /**
     * Keep legacy identifiers for the first tenant, prefix all others to satisfy global uniqueness.
     */
    private function buildTenantScopedIdentifier(string $value, Tenant $tenant, bool $keepBaseIdentifier): string
    {
        if ($keepBaseIdentifier) {
            return $value;
        }

        return sprintf('T%02d-%s', $tenant->id, $value);
    }

    /**
     * Shared category definitions used for every active tenant.
     */
    private function assetCategories(): array
    {
        return [
            ['name' => 'HVAC', 'description' => 'Heating, Ventilation, and Air Conditioning Systems'],
            ['name' => 'Network Equipment', 'description' => 'Network infrastructure and equipment'],
            ['name' => 'Power Systems', 'description' => 'Generators, UPS, and power distribution'],
            ['name' => 'Cooling Systems', 'description' => 'Data center and industrial cooling'],
        ];
    }

    /**
     * Shared asset templates that are materialized per tenant.
     */
    private function assetTemplates(): array
    {
        return [
            // Original 6
            [
                'category' => 'HVAC',
                'name' => 'Downtown Office Chiller Unit',
                'asset_tag' => 'HVAC-001',
                'serial_number' => 'CAR-2019-0847',
                'location' => 'Downtown Financial Building - Basement',
                'department' => 'Field Operations',
                'manufacturer' => 'Carrier',
                'model' => '50XC Series',
                'acquisition_date' => now()->subYears(5),
                'status' => 'operational',
                'last_maintenance' => now()->subMonths(2),
            ],
            [
                'category' => 'Network Equipment',
                'name' => 'Core Network Switch',
                'asset_tag' => 'NET-001',
                'serial_number' => 'FCW2225D1CX',
                'location' => 'Manufacturing Plant - Network Room',
                'department' => 'Technical Services',
                'manufacturer' => 'Cisco',
                'model' => 'Catalyst 9300',
                'acquisition_date' => now()->subYears(3),
                'status' => 'operational',
                'last_maintenance' => now()->subMonths(1),
            ],
            [
                'category' => 'Power Systems',
                'name' => 'Hospital Emergency Generator',
                'asset_tag' => 'GEN-001',
                'serial_number' => 'KHL-2018-5521',
                'location' => 'City General Hospital - Generator Room',
                'department' => 'Emergency Services',
                'manufacturer' => 'Kohler',
                'model' => '500 kW Diesel',
                'acquisition_date' => now()->subYears(8),
                'status' => 'maintenance',
                'last_maintenance' => now()->subMonths(4),
            ],
            [
                'category' => 'Cooling Systems',
                'name' => 'Data Center Precision Cooling',
                'asset_tag' => 'COOL-001',
                'serial_number' => 'LIE-2021-3340',
                'location' => 'CloudCore Data Center - Main Hall',
                'department' => 'Technical Services',
                'manufacturer' => 'Liebert',
                'model' => 'DSE Series',
                'acquisition_date' => now()->subMonths(8),
                'status' => 'operational',
                'last_maintenance' => now()->subMonths(1),
            ],
            [
                'category' => 'HVAC',
                'name' => 'Retail Store #7 Air Handler',
                'asset_tag' => 'HVAC-002',
                'serial_number' => 'TRN-2020-1205',
                'location' => 'RetailCorp Location #7',
                'department' => 'Field Operations',
                'manufacturer' => 'Trane',
                'model' => 'XR13 Split System',
                'acquisition_date' => now()->subYears(4),
                'status' => 'operational',
                'last_maintenance' => now()->subMonths(3),
            ],
            [
                'category' => 'Power Systems',
                'name' => 'Hospital Critical Systems UPS',
                'asset_tag' => 'UPS-001',
                'serial_number' => 'EAT-2019-8821',
                'location' => 'City General Hospital - Server Room',
                'department' => 'Emergency Services',
                'manufacturer' => 'Eaton',
                'model' => '9PX 20kVA',
                'acquisition_date' => now()->subYears(6),
                'status' => 'operational',
                'last_maintenance' => now()->subMonths(2),
            ],

            // +30 manual items
            ['category' => 'HVAC', 'name' => 'Airport Terminal AHU-2', 'asset_tag' => 'HVAC-003', 'serial_number' => 'TRN-2021-3302', 'location' => 'Airport Terminal East - Roof', 'department' => 'Field Operations', 'manufacturer' => 'Trane', 'model' => 'AHU Pro 600', 'acquisition_date' => now()->subYears(3), 'status' => 'operational', 'last_maintenance' => now()->subDays(48)],
            ['category' => 'HVAC', 'name' => 'Municipal Chiller Plant #1', 'asset_tag' => 'HVAC-004', 'serial_number' => 'CAR-2017-9911', 'location' => 'Municipal Office - Plant Room', 'department' => 'Infrastructure', 'manufacturer' => 'Carrier', 'model' => 'AquaEdge 19DV', 'acquisition_date' => now()->subYears(9), 'status' => 'maintenance', 'last_maintenance' => now()->subDays(122)],
            ['category' => 'HVAC', 'name' => 'Data Hall Return Fan Wall', 'asset_tag' => 'HVAC-005', 'serial_number' => 'DAI-2022-1192', 'location' => 'Data Center Hall B', 'department' => 'Technical Services', 'manufacturer' => 'Daikin', 'model' => 'FanWall F8', 'acquisition_date' => now()->subYears(2), 'status' => 'operational', 'last_maintenance' => now()->subDays(20)],
            ['category' => 'HVAC', 'name' => 'Clinic Ventilation Unit C-1', 'asset_tag' => 'HVAC-006', 'serial_number' => 'LEN-2020-8821', 'location' => 'Clinic South Wing', 'department' => 'Emergency Services', 'manufacturer' => 'Lennox', 'model' => 'VentX 420', 'acquisition_date' => now()->subYears(4), 'status' => 'operational', 'last_maintenance' => now()->subDays(67)],
            ['category' => 'HVAC', 'name' => 'Factory Make-up Air Unit', 'asset_tag' => 'HVAC-007', 'serial_number' => 'MUA-2018-7722', 'location' => 'Factory Block C', 'department' => 'Field Operations', 'manufacturer' => 'Greenheck', 'model' => 'MSX', 'acquisition_date' => now()->subYears(7), 'status' => 'maintenance', 'last_maintenance' => now()->subDays(140)],
            ['category' => 'HVAC', 'name' => 'Warehouse RTU #4', 'asset_tag' => 'HVAC-008', 'serial_number' => 'RTU-2019-3310', 'location' => 'Warehouse North Dock', 'department' => 'Infrastructure', 'manufacturer' => 'York', 'model' => 'Predator 12T', 'acquisition_date' => now()->subYears(5), 'status' => 'operational', 'last_maintenance' => now()->subDays(82)],
            ['category' => 'HVAC', 'name' => 'University Auditorium Air Handler', 'asset_tag' => 'HVAC-009', 'serial_number' => 'TRN-2023-1129', 'location' => 'Campus Building C', 'department' => 'Field Operations', 'manufacturer' => 'Trane', 'model' => 'Axiom AHU', 'acquisition_date' => now()->subMonths(14), 'status' => 'operational', 'last_maintenance' => now()->subDays(14)],
            ['category' => 'HVAC', 'name' => 'Retail Mall Heat Pump Cluster', 'asset_tag' => 'HVAC-010', 'serial_number' => 'MHI-2021-5048', 'location' => 'Retail Mall West Wing', 'department' => 'Field Operations', 'manufacturer' => 'Mitsubishi', 'model' => 'City Multi', 'acquisition_date' => now()->subYears(3), 'status' => 'operational', 'last_maintenance' => now()->subDays(54)],

            ['category' => 'Network Equipment', 'name' => 'Core Firewall Pair A', 'asset_tag' => 'NET-002', 'serial_number' => 'PAN-2022-4401', 'location' => 'Data Center Hall A', 'department' => 'Technical Services', 'manufacturer' => 'Palo Alto', 'model' => 'PA-3410', 'acquisition_date' => now()->subYears(2), 'status' => 'operational', 'last_maintenance' => now()->subDays(21)],
            ['category' => 'Network Equipment', 'name' => 'Distribution Switch Stack B', 'asset_tag' => 'NET-003', 'serial_number' => 'CSCO-2020-9020', 'location' => 'Campus Building 4', 'department' => 'Technical Services', 'manufacturer' => 'Cisco', 'model' => 'Catalyst 9400', 'acquisition_date' => now()->subYears(4), 'status' => 'operational', 'last_maintenance' => now()->subDays(45)],
            ['category' => 'Network Equipment', 'name' => 'Industrial Edge Router R-7', 'asset_tag' => 'NET-004', 'serial_number' => 'JNP-2019-1221', 'location' => 'Plant A - Control Room', 'department' => 'Infrastructure', 'manufacturer' => 'Juniper', 'model' => 'MX204', 'acquisition_date' => now()->subYears(6), 'status' => 'maintenance', 'last_maintenance' => now()->subDays(133)],
            ['category' => 'Network Equipment', 'name' => 'WiFi Controller Cluster', 'asset_tag' => 'NET-005', 'serial_number' => 'ARU-2021-5510', 'location' => 'Downtown HQ - Server Room', 'department' => 'Technical Services', 'manufacturer' => 'Aruba', 'model' => '7205', 'acquisition_date' => now()->subYears(3), 'status' => 'operational', 'last_maintenance' => now()->subDays(39)],
            ['category' => 'Network Equipment', 'name' => 'Hospital Core Switch C1', 'asset_tag' => 'NET-006', 'serial_number' => 'CSCO-2023-7412', 'location' => 'Hospital Wing B - MDF', 'department' => 'Emergency Services', 'manufacturer' => 'Cisco', 'model' => 'Catalyst 9500', 'acquisition_date' => now()->subMonths(10), 'status' => 'operational', 'last_maintenance' => now()->subDays(18)],
            ['category' => 'Network Equipment', 'name' => 'Airport Access Switch SW-29', 'asset_tag' => 'NET-007', 'serial_number' => 'HPE-2020-3318', 'location' => 'Airport Terminal East - IDF-3', 'department' => 'Infrastructure', 'manufacturer' => 'Aruba', 'model' => '2930F', 'acquisition_date' => now()->subYears(4), 'status' => 'operational', 'last_maintenance' => now()->subDays(63)],
            ['category' => 'Network Equipment', 'name' => 'Port Authority WAN Edge', 'asset_tag' => 'NET-008', 'serial_number' => 'FTNT-2018-8871', 'location' => 'Port Authority Site', 'department' => 'Technical Services', 'manufacturer' => 'Fortinet', 'model' => 'FortiGate 200F', 'acquisition_date' => now()->subYears(7), 'status' => 'maintenance', 'last_maintenance' => now()->subDays(150)],
            ['category' => 'Network Equipment', 'name' => 'Retail MPLS Router #12', 'asset_tag' => 'NET-009', 'serial_number' => 'CSCO-2019-7714', 'location' => 'Retail #11 - Comms Rack', 'department' => 'Technical Services', 'manufacturer' => 'Cisco', 'model' => 'ISR 4331', 'acquisition_date' => now()->subYears(5), 'status' => 'operational', 'last_maintenance' => now()->subDays(72)],

            ['category' => 'Power Systems', 'name' => 'Data Center UPS A', 'asset_tag' => 'PWR-001', 'serial_number' => 'EAT-2021-4002', 'location' => 'Data Center Hall A', 'department' => 'Infrastructure', 'manufacturer' => 'Eaton', 'model' => '93PM', 'acquisition_date' => now()->subYears(3), 'status' => 'operational', 'last_maintenance' => now()->subDays(34)],
            ['category' => 'Power Systems', 'name' => 'Campus Generator G-2', 'asset_tag' => 'PWR-002', 'serial_number' => 'KHL-2017-5009', 'location' => 'Campus Building C - Generator Yard', 'department' => 'Infrastructure', 'manufacturer' => 'Kohler', 'model' => '400 kW Diesel', 'acquisition_date' => now()->subYears(8), 'status' => 'maintenance', 'last_maintenance' => now()->subDays(121)],
            ['category' => 'Power Systems', 'name' => 'Hospital ATS Panel #3', 'asset_tag' => 'PWR-003', 'serial_number' => 'SCH-2020-1888', 'location' => 'Hospital Wing B - Electrical Room', 'department' => 'Emergency Services', 'manufacturer' => 'Schneider Electric', 'model' => 'TransferPact', 'acquisition_date' => now()->subYears(5), 'status' => 'operational', 'last_maintenance' => now()->subDays(49)],
            ['category' => 'Power Systems', 'name' => 'Airport UPS Cluster B', 'asset_tag' => 'PWR-004', 'serial_number' => 'EAT-2019-6230', 'location' => 'Airport Terminal East - Power Room', 'department' => 'Infrastructure', 'manufacturer' => 'Eaton', 'model' => '9PX 40kVA', 'acquisition_date' => now()->subYears(6), 'status' => 'operational', 'last_maintenance' => now()->subDays(58)],
            ['category' => 'Power Systems', 'name' => 'Factory MCC Backup Feed', 'asset_tag' => 'PWR-005', 'serial_number' => 'ABB-2018-7147', 'location' => 'Factory Block C - MCC Room', 'department' => 'Field Operations', 'manufacturer' => 'ABB', 'model' => 'MCC SafeLine', 'acquisition_date' => now()->subYears(7), 'status' => 'maintenance', 'last_maintenance' => now()->subDays(166)],
            ['category' => 'Power Systems', 'name' => 'Municipal Battery Bank Rack', 'asset_tag' => 'PWR-006', 'serial_number' => 'SCH-2022-1022', 'location' => 'Municipal Office Floor 2', 'department' => 'Infrastructure', 'manufacturer' => 'Schneider Electric', 'model' => 'Galaxy Battery Cabinet', 'acquisition_date' => now()->subYears(2), 'status' => 'operational', 'last_maintenance' => now()->subDays(27)],
            ['category' => 'Power Systems', 'name' => 'Port Shore Power Controller', 'asset_tag' => 'PWR-007', 'serial_number' => 'EAT-2021-7801', 'location' => 'Port Authority Site - Pier 4', 'department' => 'Infrastructure', 'manufacturer' => 'Eaton', 'model' => 'Power Xpert', 'acquisition_date' => now()->subYears(3), 'status' => 'operational', 'last_maintenance' => now()->subDays(43)],

            ['category' => 'Cooling Systems', 'name' => 'CRAC Unit Hall A-01', 'asset_tag' => 'COL-002', 'serial_number' => 'LIE-2020-3210', 'location' => 'Data Center Hall A', 'department' => 'Technical Services', 'manufacturer' => 'Liebert', 'model' => 'CRV 35kW', 'acquisition_date' => now()->subYears(5), 'status' => 'operational', 'last_maintenance' => now()->subDays(30)],
            ['category' => 'Cooling Systems', 'name' => 'CRAC Unit Hall A-02', 'asset_tag' => 'COL-003', 'serial_number' => 'LIE-2020-3211', 'location' => 'Data Center Hall A', 'department' => 'Technical Services', 'manufacturer' => 'Liebert', 'model' => 'CRV 35kW', 'acquisition_date' => now()->subYears(5), 'status' => 'operational', 'last_maintenance' => now()->subDays(31)],
            ['category' => 'Cooling Systems', 'name' => 'Free-Cooling Heat Exchanger', 'asset_tag' => 'COL-004', 'serial_number' => 'STU-2019-1772', 'location' => 'Data Center Hall B', 'department' => 'Infrastructure', 'manufacturer' => 'Stulz', 'model' => 'CyberCool 2', 'acquisition_date' => now()->subYears(6), 'status' => 'maintenance', 'last_maintenance' => now()->subDays(124)],
            ['category' => 'Cooling Systems', 'name' => 'Hospital MRI Chiller', 'asset_tag' => 'COL-005', 'serial_number' => 'VRT-2021-8882', 'location' => 'Hospital Wing B - Imaging', 'department' => 'Emergency Services', 'manufacturer' => 'Vertiv', 'model' => 'Precision MC', 'acquisition_date' => now()->subYears(3), 'status' => 'operational', 'last_maintenance' => now()->subDays(41)],
            ['category' => 'Cooling Systems', 'name' => 'Airport Server Room In-Row Cooler', 'asset_tag' => 'COL-006', 'serial_number' => 'LIE-2022-5504', 'location' => 'Airport Terminal East - Server Room', 'department' => 'Technical Services', 'manufacturer' => 'Liebert', 'model' => 'DSE InRow', 'acquisition_date' => now()->subYears(2), 'status' => 'operational', 'last_maintenance' => now()->subDays(24)],
            ['category' => 'Cooling Systems', 'name' => 'Factory Process Cooling Skid', 'asset_tag' => 'COL-007', 'serial_number' => 'STU-2018-9180', 'location' => 'Factory Block C - Utility Area', 'department' => 'Field Operations', 'manufacturer' => 'Stulz', 'model' => 'CyberCool 1', 'acquisition_date' => now()->subYears(7), 'status' => 'maintenance', 'last_maintenance' => now()->subDays(171)],
            ['category' => 'Cooling Systems', 'name' => 'Retail Cold Storage Condenser', 'asset_tag' => 'COL-008', 'serial_number' => 'VRT-2020-4420', 'location' => 'Retail #11 - Storage', 'department' => 'Field Operations', 'manufacturer' => 'Vertiv', 'model' => 'CoolLoop 14', 'acquisition_date' => now()->subYears(4), 'status' => 'operational', 'last_maintenance' => now()->subDays(57)],
        ];
    }

    /**
     * Resolve default assignee for seeded assets by department.
     */
    private function resolveDefaultAssigneeId(?string $department, array $assignees): ?int
    {
        if ($department === 'Technical Services') {
            return $assignees['technician'] ?? $assignees['manager'] ?? $assignees['fallback'] ?? null;
        }

        if ($department === 'Infrastructure' || $department === 'Emergency Services') {
            return $assignees['manager'] ?? $assignees['admin'] ?? $assignees['fallback'] ?? null;
        }

        return $assignees['admin'] ?? $assignees['fallback'] ?? null;
    }
}
