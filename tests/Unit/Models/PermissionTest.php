<?php

namespace Tests\Unit\Models;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Tests\TestCase;

class PermissionTest extends TestCase
{
    /**
     * Test: Permission has many roles via BelongsToMany
     */
    public function test_permission_has_many_roles(): void
    {
        $permission = Permission::factory()->create();
        $role1 = Role::factory()->create();
        $role2 = Role::factory()->create();

        $permission->roles()->attach([$role1->id, $role2->id]);

        $this->assertInstanceOf(BelongsToMany::class, $permission->roles());
        $this->assertCount(2, $permission->roles);
    }

    /**
     * Test: Scope forResource filters by resource
     */
    public function test_scope_for_resource_filters_by_resource(): void
    {
        $p1 = Permission::factory()->create(['resource' => 'test_contracts', 'action' => 'view_test1']);
        $p2 = Permission::factory()->create(['resource' => 'test_contracts', 'action' => 'edit_test2']);
        $p3 = Permission::factory()->create(['resource' => 'test_incidents', 'action' => 'view_test3']);
        $p4 = Permission::factory()->create(['resource' => 'test_incidents', 'action' => 'create_test4']);
        $p5 = Permission::factory()->create(['resource' => 'test_incidents', 'action' => 'delete_test5']);
        $p6 = Permission::factory()->create(['resource' => 'test_assets', 'action' => 'view_test6']);

        $this->assertEquals(2, Permission::forResource('test_contracts')->count());
        $this->assertEquals(3, Permission::forResource('test_incidents')->count());
    }

    /**
     * Test: Can get permission identifier
     */
    public function test_can_get_permission_identifier(): void
    {
        $permission = Permission::factory()->create([
            'resource' => 'contracts_identifier',
            'action' => 'view_identifier',
        ]);

        $this->assertEquals('contracts_identifier.view_identifier', $permission->getIdentifier());
    }

    /**
     * Test: Permission has no timestamps
     */
    public function test_permission_has_no_timestamps(): void
    {
        $permission = new Permission;

        $this->assertFalse($permission->timestamps);
    }
}
