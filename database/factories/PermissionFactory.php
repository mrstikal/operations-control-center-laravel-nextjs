<?php

namespace Database\Factories;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Permission>
 */
class PermissionFactory extends Factory
{
    protected $model = Permission::class;

    public function definition(): array
    {
        static $counter = 0;
        $counter++;

        $resource = fake()->randomElement(['contracts', 'incidents', 'assets', 'users', 'reports', 'settings']);
        $action = fake()->randomElement(['view', 'create', 'edit', 'delete', 'approve', 'export']);

        return [
            'name' => "{$resource}.{$action}.{$counter}",
            'description' => fake()->sentence(),
            'resource' => $resource,
            'action' => "{$action}_{$counter}",
        ];
    }
}
