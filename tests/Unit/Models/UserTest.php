<?php

namespace Tests\Unit\Models;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected Role $adminRole;

    protected Role $managerRole;

    protected Role $superadminRole;

    protected function setUp(): void
    {
        parent::setUp();

        $tenant = Tenant::create([
            'name' => 'Test Company',
            'status' => 'active',
        ]);

        $this->adminRole = Role::where('name', 'Admin')->firstOrFail();
        $this->superadminRole = Role::where('name', 'Superadmin')->firstOrFail();
        $this->managerRole = Role::where('name', 'Manager')->firstOrFail();

        $permission = Permission::where('resource', 'contracts')
            ->where('action', 'view')
            ->firstOrFail();

        $this->adminRole->permissions()->syncWithoutDetaching([$permission->id]);

        $this->user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'viewer',
        ]);
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
     * Test: Legacy role attribute does not grant admin access without RBAC role.
     */
    public function test_legacy_role_attribute_does_not_grant_admin_access(): void
    {
        $legacyAdmin = User::factory()->create([
            'tenant_id' => $this->user->tenant_id,
            'role' => 'admin',
        ]);

        $this->assertFalse($legacyAdmin->isAdmin());
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
        $this->user->roles()->sync([$viewerRole->id]);

        // Viewer cannot create contracts
        $this->assertFalse($this->user->hasPermission('contracts', 'create'));
    }

    /**
     * Test: Superadmin has implicit full permission bypass.
     */
    public function test_superadmin_has_implicit_full_permissions(): void
    {
        $this->user->roles()->attach($this->superadminRole);

        $this->assertTrue($this->user->hasPermission('contracts', 'create'));
        $this->assertTrue($this->user->hasPermission('system', 'manage_tenants'));
    }

    /**
     * Test: Legacy superadmin role attribute keeps superadmin capabilities.
     */
    public function test_legacy_superadmin_role_attribute_grants_superadmin_access(): void
    {
        $legacySuperadmin = User::factory()->create([
            'tenant_id' => $this->user->tenant_id,
            'role' => 'superadmin',
        ]);

        $this->assertTrue($legacySuperadmin->isSuperadmin());
        $this->assertTrue($legacySuperadmin->isAdmin());
        $this->assertTrue($legacySuperadmin->hasPermission('system', 'manage_tenants'));
    }
}
