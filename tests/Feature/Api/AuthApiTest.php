<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    /**
     * Test: Can login with valid credentials
     */
    public function test_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
            'tenant_id' => 1,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => ['user']])
            ->assertJsonPath('data.user.email', 'test@example.com');
        $response->assertJsonMissingPath('data.token');
    }

    /**
     * Test: Cannot login with invalid credentials
     */
    public function test_cannot_login_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('success', false);
    }

    /**
     * Test: Cannot login with non-existent email
     */
    public function test_cannot_login_with_non_existent_email(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test: Can register new user
     */
    public function test_can_register_new_user(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '+420123456789',
            'tenant_id' => 1, // Default Tenant created in TestCase::setUp()
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['user']])
            ->assertJsonPath('data.user.name', 'John Doe')
            ->assertJsonPath('data.user.email', 'john@example.com');

        $response->assertJsonMissingPath('data.token');

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'tenant_id' => 1,
        ]);
    }

    /**
     * Test: Cannot register without tenant_id
     */
    public function test_cannot_register_without_tenant_id(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.tenant_id.0', 'The tenant id field is required.');
    }

    /**
     * Test: Cannot register with non-existent tenant
     */
    public function test_cannot_register_with_nonexistent_tenant(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'tenant_id' => 99999,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.tenant_id.0', 'The selected tenant id is invalid.');
    }

    /**
     * Test: Cannot register with archived (soft-deleted) tenant
     */
    public function test_cannot_register_with_archived_tenant(): void
    {
        $archivedTenant = Tenant::factory()->create(['status' => 'active']);
        $archivedTenant->delete();

        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'tenant_id' => $archivedTenant->id,
        ]);

        $response->assertStatus(422);
    }

    /**
     * Test: Cannot register with duplicate email
     */
    public function test_cannot_register_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'existing@example.com']);

        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'existing@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'tenant_id' => 1,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.email', ['The email has already been taken.']);
    }

    /**
     * Test: Password confirmation must match
     */
    public function test_password_confirmation_must_match(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => 'password123',
            'password_confirmation' => 'differentpassword',
            'tenant_id' => 1,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('errors.password', ['The password field confirmation does not match.']);
    }

    /**
     * Test: Can get current user info
     */
    public function test_can_get_current_user(): void
    {
        $user = User::factory()->create(['tenant_id' => 1]);
        $response = $this->actingAs($user)
            ->getJson('/api/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email);
    }

    /**
     * Test: Can logout
     */
    public function test_can_logout(): void
    {
        $user = User::factory()->create(['tenant_id' => 1]);
        $response = $this->actingAs($user)
            ->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
        $this->assertGuest('web');
    }

    /**
     * Test: Unauthenticated request fails
     */
    public function test_unauthenticated_request_fails(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(401);
    }

    public function test_me_rejects_invalid_token(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer invalid-token')
            ->getJson('/api/me');

        $response->assertStatus(401);
    }

    public function test_admin_can_set_default_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => 1]);
        $user->roles()->attach(Role::where('name', 'Admin')->first());

        $response = $this->actingAs($user)
            ->postJson('/api/me/default-tenant', [
                'tenant_id' => $tenant->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.default_tenant_id', $tenant->id);

        $this->assertSame($tenant->id, $user->fresh()->getDefaultTenantId());
    }

    public function test_non_admin_cannot_set_default_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => 1]);

        $response = $this->actingAs($user)
            ->postJson('/api/me/default-tenant', [
                'tenant_id' => $tenant->id,
            ]);

        $response->assertStatus(403);
    }

    public function test_logout_revokes_all_user_tokens(): void
    {
        $user = User::factory()->create(['tenant_id' => 1]);
        $firstToken = $user->createToken('first-device')->plainTextToken;
        $user->createToken('second-device');

        $this->assertSame(2, PersonalAccessToken::where('tokenable_id', $user->id)->count());

        $response = $this->actingAs($user)
            ->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertSame(0, PersonalAccessToken::where('tokenable_id', $user->id)->count());
    }

    public function test_admin_cannot_set_default_tenant_to_archived_or_inactive(): void
    {
        $archivedTenant = Tenant::factory()->create(['status' => 'active']);
        $archivedTenant->delete();

        $inactiveTenant = Tenant::factory()->create(['status' => 'suspended']);

        $admin = User::factory()->create(['tenant_id' => 1]);
        $admin->roles()->attach(Role::where('name', 'Admin')->first());

        $archivedResponse = $this->actingAs($admin)
            ->postJson('/api/me/default-tenant', ['tenant_id' => $archivedTenant->id]);

        $archivedResponse->assertStatus(422);

        $inactiveResponse = $this->actingAs($admin)
            ->postJson('/api/me/default-tenant', ['tenant_id' => $inactiveTenant->id]);

        $inactiveResponse->assertStatus(422);
    }

    public function test_superadmin_can_set_archived_default_tenant_but_not_inactive(): void
    {
        $archivedTenant = Tenant::factory()->create(['status' => 'active']);
        $archivedTenant->delete();

        $inactiveTenant = Tenant::factory()->create(['status' => 'suspended']);

        $superadmin = User::factory()->create(['tenant_id' => 1]);
        $superadmin->roles()->attach(Role::where('name', 'Superadmin')->first());

        $archivedResponse = $this->actingAs($superadmin)
            ->postJson('/api/me/default-tenant', ['tenant_id' => $archivedTenant->id]);

        $archivedResponse->assertStatus(200)
            ->assertJsonPath('data.default_tenant_id', $archivedTenant->id);

        $inactiveResponse = $this->actingAs($superadmin)
            ->postJson('/api/me/default-tenant', ['tenant_id' => $inactiveTenant->id]);

        $inactiveResponse->assertStatus(422);
    }
}
