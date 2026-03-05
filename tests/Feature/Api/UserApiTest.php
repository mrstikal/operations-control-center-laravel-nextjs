<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Tests\TestCase;

class UserApiTest extends TestCase
{
    protected User $admin;
    protected User $manager;
    protected string $adminToken;
    protected string $managerToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['tenant_id' => 1, 'role' => 'admin']);
        $this->manager = User::factory()->create(['tenant_id' => 1, 'role' => 'manager']);

        $this->admin->roles()->attach(Role::where('name', 'Admin')->first());
        $this->manager->roles()->attach(Role::where('name', 'Manager')->first());

        $this->adminToken = $this->admin->createToken('test')->plainTextToken;
        $this->managerToken = $this->manager->createToken('test')->plainTextToken;
    }

    /**
     * Test: Can list users
     */
    public function test_can_list_users(): void
    {
        User::factory(5)->create(['tenant_id' => 1]);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/users');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'message', 'data', 'pagination']);
    }

    /**
     * Test: Can view user profile
     */
    public function test_can_view_user_profile(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/users/profile/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $this->admin->id)
            ->assertJsonPath('data.email', $this->admin->email);
    }

    /**
     * Test: Can update own profile
     */
    public function test_can_update_own_profile(): void
    {
        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->putJson("/api/users/{$this->admin->id}/update-profile", [
                'phone' => '+420123456789',
                'bio' => 'Senior technician',
                'avatar_url' => 'https://example.com/avatar.jpg',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.phone', '+420123456789')
            ->assertJsonPath('data.bio', 'Senior technician');
    }

    /**
     * Test: Can assign role to user
     */
    public function test_can_assign_role_to_user(): void
    {
        $user = User::factory()->create(['tenant_id' => 1]);
        $techRole = Role::where('name', 'Technician')->first();

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->postJson("/api/users/{$user->id}/assign-role", [
                'role_id' => $techRole->id,
            ]);

        $response->assertStatus(200);
        $this->assertTrue($user->roles->contains($techRole));
    }

    /**
     * Test: Can remove role from user
     */
    public function test_can_remove_role_from_user(): void
    {
        $user = User::factory()->create(['tenant_id' => 1]);
        $techRole = Role::where('name', 'Technician')->first();
        $user->roles()->attach($techRole);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->deleteJson("/api/users/{$user->id}/remove-role/{$techRole->id}");

        $response->assertStatus(200);
        $this->assertFalse($user->fresh()->roles->contains($techRole));
    }

    /**
     * Test: Manager cannot assign higher role
     */
    public function test_manager_cannot_assign_higher_role(): void
    {
        $user = User::factory()->create(['tenant_id' => 1]);
        $adminRole = Role::where('name', 'Admin')->first();

        $response = $this->withHeader('Authorization', "Bearer {$this->managerToken}")
            ->postJson("/api/users/{$user->id}/assign-role", [
                'role_id' => $adminRole->id,
            ]);

        $response->assertStatus(403);
    }

    /**
     * Test: Filter users by role
     */
    public function test_can_filter_users_by_role(): void
    {
        $adminRole = Role::where('name', 'Admin')->first();
        $managerRole = Role::where('name', 'Manager')->first();

        User::factory(3)->create(['tenant_id' => 1])->each(fn($u) => $u->roles()->attach($adminRole));
        User::factory(2)->create(['tenant_id' => 1])->each(fn($u) => $u->roles()->attach($managerRole));

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/users?role=Admin');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 4); // 3 + original admin
    }

    /**
     * Test: Search users by name
     */
    public function test_can_search_users_by_name(): void
    {
        User::factory()->create(['tenant_id' => 1, 'name' => 'John Technician']);
        User::factory()->create(['tenant_id' => 1, 'name' => 'Jane Developer']);

        $response = $this->withHeader('Authorization', "Bearer {$this->adminToken}")
            ->getJson('/api/users?search=John');

        $response->assertStatus(200)
            ->assertJsonPath('pagination.total', 1);
    }
}

