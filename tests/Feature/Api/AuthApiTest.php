<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
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
            ->assertJsonStructure(['data' => ['user', 'token']])
            ->assertJsonPath('data.user.email', 'test@example.com');

        $this->assertNotEmpty($response->json('data.token'));
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
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['user', 'token']])
            ->assertJsonPath('data.user.name', 'John Doe')
            ->assertJsonPath('data.user.email', 'john@example.com');

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
        ]);
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
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
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
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        // Token should be revoked
        $response2 = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me');

        $response2->assertStatus(401);
    }

    /**
     * Test: Unauthenticated request fails
     */
    public function test_unauthenticated_request_fails(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(401);
    }
}

