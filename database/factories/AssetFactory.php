<?php

namespace Database\Factories;

use App\Models\Asset;
use App\Models\AssetCategory;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Asset>
 */
class AssetFactory extends Factory
{
    protected $model = Asset::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'category_id' => AssetCategory::factory(),
            'name' => fake()->words(2, true),
            'asset_tag' => 'AST-'.fake()->unique()->numerify('#####'),
            'serial_number' => fake()->optional()->bothify('SN-####-??'),
            'description' => fake()->optional()->sentence(),
            'location' => fake()->optional()->city(),
            'department' => fake()->optional()->word(),
            'manufacturer' => fake()->optional()->company(),
            'model' => fake()->optional()->word(),
            'acquisition_date' => fake()->optional()->date(),
            'warranty_expiry' => fake()->optional()->date(),
            'status' => 'operational',
            'utilization_percent' => fake()->randomFloat(2, 0, 100),
            'last_maintenance' => fake()->optional()->dateTimeBetween('-90 days', 'now'),
            'next_maintenance' => fake()->optional()->dateTimeBetween('now', '+90 days'),
            'maintenance_interval_days' => fake()->optional()->numberBetween(30, 180),
            'specifications' => null,
            'custom_fields' => null,
            'documents' => null,
        ];
    }
}
