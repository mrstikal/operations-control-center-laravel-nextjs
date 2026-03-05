<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

/**
 * AuthController - Authentication API endpoints
 */
class AuthController extends BaseApiController
{
    /**
     * POST /api/login
     * Přihlášení uživatele
     */
    public function login(): JsonResponse
    {
        $credentials = request()->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return $this->unauthorized('Invalid credentials');
        }

        // Update last login
        $user->updateLastLogin();

        // Create token
        $token = $user->createToken('api-token')->plainTextToken;

        return $this->success([
            'user' => new UserResource($user->load('roles', 'employeeProfile')),
            'token' => $token,
        ], 'Logged in successfully');
    }

    /**
     * POST /api/register
     * Registrace nového uživatele
     */
    public function register(): JsonResponse
    {
        $validated = request()->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'tenant_id' => 1, // Default tenant - měl by být dynamický
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'status' => 'active',
            'role' => 'viewer', // Default role
        ]);

        // Přiřadit default role
        $viewerRole = \App\Models\Role::where('name', 'Viewer')->first();
        if ($viewerRole) {
            $user->roles()->attach($viewerRole);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return $this->created([
            'user' => new UserResource($user->load('roles')),
            'token' => $token,
        ], 'User registered successfully');
    }

    /**
     * GET /api/me
     * Vrátí aktuální přihlášeného uživatele
     */
    public function me(): JsonResponse
    {
        return $this->success(
            new UserResource(auth()->user()->load('roles', 'employeeProfile')),
            'Current user'
        );
    }

    /**
     * POST /api/logout
     * Odhlášení uživatele
     */
    public function logout(): JsonResponse
    {
        auth()->user()->tokens()->delete();

        return $this->success(null, 'Logged out successfully');
    }
}

