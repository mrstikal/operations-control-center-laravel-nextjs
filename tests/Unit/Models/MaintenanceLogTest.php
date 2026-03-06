<?php

namespace Tests\Unit\Models;

use App\Models\Asset;
use App\Models\MaintenanceLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class MaintenanceLogTest extends TestCase
{
    /**
     * Test: MaintenanceLog belongs to asset
     */
    public function test_maintenance_log_belongs_to_asset(): void
    {
        $asset = Asset::factory()->create();
        $log = MaintenanceLog::create([
            'asset_id' => $asset->id,
            'performed_by' => User::factory()->create()->id,
            'type' => 'preventive',
            'description' => 'Regular maintenance',
            'performed_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $log->asset());
        $this->assertEquals($asset->id, $log->asset->id);
    }

    /**
     * Test: MaintenanceLog belongs to performedBy user
     */
    public function test_maintenance_log_belongs_to_performed_by_user(): void
    {
        $user = User::factory()->create();
        $log = MaintenanceLog::create([
            'asset_id' => Asset::factory()->create()->id,
            'performed_by' => $user->id,
            'type' => 'corrective',
            'description' => 'Fixed issue',
            'performed_at' => now(),
        ]);

        $this->assertInstanceOf(BelongsTo::class, $log->performedBy());
        $this->assertEquals($user->id, $log->performedBy->id);
    }

    /**
     * Test: Scope byType filters by type
     */
    public function test_scope_by_type_filters_correctly(): void
    {
        $asset = Asset::factory()->create();

        MaintenanceLog::create([
            'asset_id' => $asset->id,
            'performed_by' => User::factory()->create()->id,
            'type' => 'preventive',
            'description' => 'Preventive 1',
            'performed_at' => now(),
        ]);

        MaintenanceLog::create([
            'asset_id' => $asset->id,
            'performed_by' => User::factory()->create()->id,
            'type' => 'preventive',
            'description' => 'Preventive 2',
            'performed_at' => now(),
        ]);

        MaintenanceLog::create([
            'asset_id' => $asset->id,
            'performed_by' => User::factory()->create()->id,
            'type' => 'corrective',
            'description' => 'Corrective 1',
            'performed_at' => now(),
        ]);

        $this->assertEquals(2, MaintenanceLog::byType('preventive')->count());
        $this->assertEquals(1, MaintenanceLog::byType('corrective')->count());
    }

    /**
     * Test: Datetime field is cast to Carbon
     */
    public function test_datetime_field_is_cast_to_carbon(): void
    {
        $log = MaintenanceLog::create([
            'asset_id' => Asset::factory()->create()->id,
            'performed_by' => User::factory()->create()->id,
            'type' => 'inspection',
            'description' => 'Inspection',
            'performed_at' => now(),
        ]);

        $this->assertInstanceOf(Carbon::class, $log->performed_at);
    }

    /**
     * Test: Decimal fields are cast correctly
     */
    public function test_decimal_fields_are_cast_correctly(): void
    {
        $log = MaintenanceLog::create([
            'asset_id' => Asset::factory()->create()->id,
            'performed_by' => User::factory()->create()->id,
            'type' => 'preventive',
            'description' => 'Maintenance with cost',
            'hours_spent' => 3.5,
            'cost' => 250.75,
            'performed_at' => now(),
        ]);

        $this->assertSame('3.50', $log->hours_spent);
        $this->assertSame('250.75', $log->cost);
    }

    /**
     * Test: parts_replaced field is cast to json
     */
    public function test_parts_replaced_field_is_cast_to_json(): void
    {
        $log = MaintenanceLog::create([
            'asset_id' => Asset::factory()->create()->id,
            'performed_by' => User::factory()->create()->id,
            'type' => 'corrective',
            'description' => 'Replaced parts',
            'parts_replaced' => ['filter', 'oil', 'belt'],
            'performed_at' => now(),
        ]);

        $this->assertIsArray($log->parts_replaced);
        $this->assertSame(['filter', 'oil', 'belt'], $log->parts_replaced);
    }
}
