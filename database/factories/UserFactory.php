<?php

namespace Database\Factories;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => \App\Models\Tenant::factory(),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (User $user) {
            $viewerRole = Role::whereIn('name', ['Viewer', 'Viewer – Management'])
                ->orderByRaw("CASE WHEN name = 'Viewer' THEN 0 ELSE 1 END")
                ->first();

            if (! $viewerRole) {
                $viewerRole = Role::create([
                    'name' => 'Viewer',
                    'description' => 'Auto-created viewer role for tests',
                    'level' => 1,
                    'is_system' => true,
                ]);
            }

            if (! $user->roles()->where('roles.id', $viewerRole->id)->exists()) {
                $user->roles()->attach($viewerRole->id);
            }
        });
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
