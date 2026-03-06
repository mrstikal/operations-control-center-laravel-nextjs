<?php

namespace Database\Factories;

use App\Models\Contract;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contract>
 */
class ContractFactory extends Factory
{
    protected $model = Contract::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'contract_number' => 'CTR-'.fake()->unique()->numerify('#####'),
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'client_id' => User::factory(),
            'assigned_to' => User::factory(),
            'status' => fake()->randomElement(['draft', 'approved', 'in_progress', 'blocked', 'done']),
            'priority' => fake()->randomElement(['low', 'medium', 'high', 'critical']),
            'start_date' => fake()->dateTimeBetween('-30 days', 'now'),
            'due_date' => fake()->dateTimeBetween('now', '+60 days'),
            'completed_at' => null,
            'sla_hours' => fake()->numberBetween(24, 240),
            'sla_deadline' => fake()->dateTimeBetween('now', '+30 days'),
            'sla_status' => fake()->randomElement(['on_track', 'at_risk', 'breached']),
            'budget' => fake()->randomFloat(2, 1000, 100000),
            'spent' => fake()->randomFloat(2, 0, 50000),
            'tags' => ['test'],
            'custom_fields' => null,
            'version' => 1,
        ];
    }
}
