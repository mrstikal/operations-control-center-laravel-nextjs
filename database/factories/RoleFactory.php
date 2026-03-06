<?php

namespace Database\Factories;

use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Role>
 */
class RoleFactory extends Factory
{
    protected $model = Role::class;

    public function definition(): array
    {
        $baseName = fake()->randomElement(['Admin', 'Manager', 'Technician', 'Viewer', 'Operator', 'Analyst']);

        return [
            'name' => $baseName.' '.fake()->unique()->numerify('##'),
            'description' => fake()->sentence(),
            'level' => fake()->numberBetween(1, 4),
            'is_system' => fake()->boolean(30),
            'metadata' => null,
        ];
    }
}
