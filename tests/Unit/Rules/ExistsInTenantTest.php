<?php

namespace Tests\Unit\Rules;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\Tenant;
use App\Models\User;
use App\Rules\ExistsInTenant;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class ExistsInTenantTest extends TestCase
{
    public function test_rule_passes_for_record_in_same_tenant(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $user = User::factory()->create(['tenant_id' => $tenant->id]);

        $validator = Validator::make(
            ['assigned_to' => $user->id],
            ['assigned_to' => [new ExistsInTenant('users', 'id', $tenant->id)]]
        );

        $this->assertFalse($validator->fails());
    }

    public function test_rule_fails_for_record_in_different_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'status' => 'active']);

        $otherTenantUser = User::factory()->create(['tenant_id' => $tenantB->id]);

        $validator = Validator::make(
            ['assigned_to' => $otherTenantUser->id],
            ['assigned_to' => [new ExistsInTenant('users', 'id', $tenantA->id)]]
        );

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('assigned_to', $validator->errors()->toArray());
    }

    public function test_rule_handles_multiple_tenant_scoped_tables(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'status' => 'active']);

        $category = AssetCategory::factory()->create(['tenant_id' => $tenant->id]);
        $contract = Contract::factory()->create(['tenant_id' => $tenant->id]);
        $asset = Asset::factory()->create(['tenant_id' => $tenant->id, 'category_id' => $category->id]);
        $incident = Incident::factory()->create([
            'tenant_id' => $tenant->id,
            'contract_id' => $contract->id,
            'asset_id' => $asset->id,
        ]);

        $validator = Validator::make(
            [
                'category_id' => $category->id,
                'contract_id' => $contract->id,
                'asset_id' => $asset->id,
                'incident_id' => $incident->id,
            ],
            [
                'category_id' => [new ExistsInTenant('asset_categories', 'id', $tenant->id)],
                'contract_id' => [new ExistsInTenant('contracts', 'id', $tenant->id)],
                'asset_id' => [new ExistsInTenant('assets', 'id', $tenant->id)],
                'incident_id' => [new ExistsInTenant('incidents', 'id', $tenant->id)],
            ]
        );

        $this->assertFalse($validator->fails());
    }
}
