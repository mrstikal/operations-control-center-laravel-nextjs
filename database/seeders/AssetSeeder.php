<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AssetSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'default')->first();
        if (!$tenant) return;

        // Create asset categories
        $categories = [
            ['name' => 'HVAC', 'description' => 'Heating, Ventilation, and Air Conditioning Systems'],
            ['name' => 'Network Equipment', 'description' => 'Network infrastructure and equipment'],
            ['name' => 'Power Systems', 'description' => 'Generators, UPS, and power distribution'],
            ['name' => 'Cooling Systems', 'description' => 'Data center and industrial cooling'],
        ];

        $categoryIds = [];
        foreach ($categories as $cat) {
            $id = DB::table('asset_categories')->insertGetId([
                'tenant_id' => $tenant->id,
                'name' => $cat['name'],
                'description' => $cat['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $categoryIds[$cat['name']] = $id;
        }

        $assets = [
            [
                'tenant_id' => $tenant->id,
                'category_id' => $categoryIds['HVAC'],
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
                'condition' => 'good',
            ],
            [
                'tenant_id' => $tenant->id,
                'category_id' => $categoryIds['Network Equipment'],
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
                'condition' => 'excellent',
            ],
            [
                'tenant_id' => $tenant->id,
                'category_id' => $categoryIds['Power Systems'],
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
                'condition' => 'fair',
            ],
            [
                'tenant_id' => $tenant->id,
                'category_id' => $categoryIds['Cooling Systems'],
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
                'condition' => 'excellent',
            ],
            [
                'tenant_id' => $tenant->id,
                'category_id' => $categoryIds['HVAC'],
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
                'condition' => 'fair',
            ],
            [
                'tenant_id' => $tenant->id,
                'category_id' => $categoryIds['Power Systems'],
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
                'condition' => 'good',
            ],
        ];

        foreach ($assets as $asset) {
            DB::table('assets')->insert([
                'tenant_id' => $asset['tenant_id'],
                'category_id' => $asset['category_id'],
                'name' => $asset['name'],
                'asset_tag' => $asset['asset_tag'],
                'serial_number' => $asset['serial_number'],
                'location' => $asset['location'],
                'department' => $asset['department'],
                'manufacturer' => $asset['manufacturer'],
                'model' => $asset['model'],
                'acquisition_date' => $asset['acquisition_date'],
                'status' => $asset['status'],
                'last_maintenance' => $asset['last_maintenance'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}

