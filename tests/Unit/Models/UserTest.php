<?php

namespace Tests\Unit\Models;

use App\Models\User;
use App\Models\Role;
use Tests\TestCase;

class UserTest extends TestCase
{
    protected User $user;
    protected Role $adminRole;
    protected Role $managerRole;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->adminRole = Role::where('name', 'Admin')->first();
        $this->managerRole = Role::where('name', 'Manager')->first();
    }

    /**
     * Test: User can have roles
     */
    public function test_user_can_have_roles(): void
    {
        $this->user->roles()->attach($this->adminRole);

        $this->assertTrue($this->user->roles->contains($this->adminRole));
        $this->assertFalse($this->user->roles->contains($this->managerRole));
    }

    /**
     * Test: User can check if has role
     */
    public function test_user_can_check_has_role(): void
    {
        $this->user->roles()->attach($this->adminRole);

        $this->assertTrue($this->user->hasRole('Admin'));
        $this->assertFalse($this->user->hasRole('Manager'));
    }

    /**
     * Test: User can check multiple roles
     */
    public function test_user_can_check_multiple_roles(): void
    {
        $this->user->roles()->attach($this->managerRole);

        $this->assertTrue($this->user->hasRole(['Admin', 'Manager']));
    }

    /**
     * Test: Admin is admin
     */
    public function test_admin_is_admin(): void
    {
        $this->user->roles()->attach($this->adminRole);

        $this->assertTrue($this->user->isAdmin());
    }

    /**
     * Test: Manager is not admin
     */
    public function test_manager_is_not_admin(): void
    {
        $this->user->roles()->attach($this->managerRole);

        $this->assertFalse($this->user->isAdmin());
    }

    /**
     * Test: User can check permission
     */
    public function test_user_can_check_permission(): void
    {
        $this->user->roles()->attach($this->adminRole);

        // Admin has contracts.view permission
        $this->assertTrue($this->user->hasPermission('contracts', 'view'));
    }

    /**
     * Test: User without permission cannot access
     */
    public function test_user_without_permission_cannot_access(): void
    {
        $viewerRole = Role::where('name', 'Viewer')->first();
        $this->user->roles()->attach($viewerRole);

        // Viewer cannot create contracts
        $this->assertFalse($this->user->hasPermission('contracts', 'create'));
    }
}

