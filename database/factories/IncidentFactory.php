<?php

namespace Database\Factories;

use App\Models\Contract;
use App\Models\Incident;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Incident>
 */
class IncidentFactory extends Factory
{
    protected $model = Incident::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'incident_number' => 'INC-'.fake()->unique()->numerify('#####'),
            'contract_id' => Contract::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'category' => fake()->randomElement(['infrastructure', 'application', 'security', 'network']),
            'severity' => fake()->randomElement(['low', 'medium', 'high', 'critical']),
            'priority' => fake()->randomElement(['low', 'medium', 'high', 'critical']),
            'status' => fake()->randomElement(['open', 'in_progress', 'escalated', 'resolved', 'closed']),
            'reported_by' => User::factory(),
            'assigned_to' => null,
            'escalated_to' => null,
            'reported_at' => now(),
            'acknowledged_at' => null,
            'started_at' => null,
            'resolved_at' => null,
            'closed_at' => null,
            'sla_response_minutes' => 30,
            'sla_resolution_minutes' => 480,
            'sla_response_deadline' => now()->addMinutes(30),
            'sla_resolution_deadline' => now()->addMinutes(480),
            'sla_breached' => false,
            'tags' => [],
            'resolution_summary' => null,
            'custom_fields' => null,
            'version' => 1,
        ];
    }
}
