<?php

namespace Tests\Unit\Models;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Tests\TestCase;

class AssetCategoryTest extends TestCase
{
    /**
     * Test: AssetCategory belongs to tenant
     */
    public function test_asset_category_belongs_to_tenant(): void
    {
        $category = AssetCategory::factory()->create();

        $this->assertInstanceOf(BelongsTo::class, $category->tenant());
        $this->assertInstanceOf(Tenant::class, $category->tenant);
    }

    /**
     * Test: AssetCategory has many assets
     */
    public function test_asset_category_has_many_assets(): void
    {
        $category = AssetCategory::factory()->create();
        Asset::factory(5)->create(['category_id' => $category->id]);

        $this->assertInstanceOf(HasMany::class, $category->assets());
        $this->assertCount(5, $category->assets);
    }

    /**
     * Test: Scope ofTenant filters by tenant_id
     */
    public function test_scope_of_tenant_filters_by_tenant_id(): void
    {
        AssetCategory::factory(3)->create(['tenant_id' => 1]);
        AssetCategory::factory(2)->create(['tenant_id' => 999]);

        $this->assertEquals(3, AssetCategory::ofTenant(1)->count());
        $this->assertEquals(2, AssetCategory::ofTenant(999)->count());
    }
}
