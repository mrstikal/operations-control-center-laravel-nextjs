<?php

namespace Tests\Unit\Models;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Tests\TestCase;

class RoleTest extends TestCase
{
    /**
     * Test: Role has many permissions via BelongsToMany
     */
    public function test_role_has_many_permissions(): void
    {
        $role = Role::factory()->create();
        $permission1 = Permission::factory()->create();
        $permission2 = Permission::factory()->create();

        $role->permissions()->attach([$permission1->id, $permission2->id]);

        $this->assertInstanceOf(BelongsToMany::class, $role->permissions());
        $this->assertCount(2, $role->permissions);
    }

    /**
     * Test: Role has many users via BelongsToMany
     */
    public function test_role_has_many_users(): void
    {
        $role = Role::factory()->create();
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $role->users()->attach([$user1->id, $user2->id]);

        $this->assertInstanceOf(BelongsToMany::class, $role->users());
        $this->assertCount(2, $role->users);
    }

    /**
     * Test: Can check if role is system role
     */
    public function test_can_check_if_role_is_system(): void
    {
        $systemRole = Role::factory()->create(['is_system' => true]);
        $customRole = Role::factory()->create(['is_system' => false]);

        $this->assertTrue($systemRole->isSystem());
        $this->assertFalse($customRole->isSystem());
    }

    /**
     * Test: Get level hierarchy returns correct values
     */
    public function test_get_level_hierarchy_returns_correct_values(): void
    {
        $this->assertEquals(4, Role::getLevelHierarchy('admin'));
        $this->assertEquals(3, Role::getLevelHierarchy('manager'));
        $this->assertEquals(2, Role::getLevelHierarchy('technician'));
        $this->assertEquals(1, Role::getLevelHierarchy('viewer'));
        $this->assertEquals(0, Role::getLevelHierarchy('unknown'));
    }

    /**
     * Test: Metadata field is cast to json
     */
    public function test_metadata_field_is_cast_to_json(): void
    {
        $role = Role::factory()->create([
            'metadata' => ['color' => 'blue', 'icon' => 'shield'],
        ]);

        $this->assertIsArray($role->metadata);
        $this->assertSame(['color' => 'blue', 'icon' => 'shield'], $role->metadata);
    }

    /**
     * Test: is_system field is cast to boolean
     */
    public function test_is_system_field_is_cast_to_boolean(): void
    {
        $role = Role::factory()->create(['is_system' => 1]);

        $this->assertIsBool($role->is_system);
        $this->assertTrue($role->is_system);
    }
}
