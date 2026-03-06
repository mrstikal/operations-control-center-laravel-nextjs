<?php

namespace Tests\Feature\Api;

use App\Models\Notification;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    public function test_admin_can_read_unread_count_across_all_tenants(): void
    {
        $tenant1 = Tenant::firstWhere('name', 'Default Tenant');
        $tenant2 = Tenant::factory()->create(['name' => 'Second Tenant']);

        $admin = User::factory()->create(['tenant_id' => $tenant1->id]);
        $admin->roles()->attach(Role::where('name', 'Admin')->firstOrFail());

        $tenant2User = User::factory()->create(['tenant_id' => $tenant2->id]);

        Notification::create([
            'tenant_id' => $tenant1->id,
            'user_id' => $admin->id,
            'type' => 'incident_assigned',
            'title' => 'Tenant 1 unread',
            'message' => 'Unread notification in tenant 1',
            'priority' => 'medium',
            'read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Notification::create([
            'tenant_id' => $tenant2->id,
            'user_id' => $tenant2User->id,
            'type' => 'incident_assigned',
            'title' => 'Tenant 2 unread',
            'message' => 'Unread notification in tenant 2',
            'priority' => 'medium',
            'read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($admin, 'web')
            ->getJson('/api/notifications/unread-count?all_tenants=1')
            ->assertStatus(200)
            ->assertJsonPath('data.count', 2);
    }

    public function test_technician_can_read_only_own_unread_count(): void
    {
        $tenant = Tenant::firstWhere('name', 'Default Tenant');

        $technician = User::factory()->create(['tenant_id' => $tenant->id]);
        $technician->roles()->attach(Role::where('name', 'Technician')->firstOrFail());

        $otherUser = User::factory()->create(['tenant_id' => $tenant->id]);

        Notification::create([
            'tenant_id' => $tenant->id,
            'user_id' => $technician->id,
            'type' => 'incident_assigned',
            'title' => 'Own unread',
            'message' => 'Unread notification for technician',
            'priority' => 'medium',
            'read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Notification::create([
            'tenant_id' => $tenant->id,
            'user_id' => $otherUser->id,
            'type' => 'incident_assigned',
            'title' => 'Foreign unread',
            'message' => 'Unread notification for someone else',
            'priority' => 'medium',
            'read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($technician, 'web')
            ->getJson('/api/notifications/unread-count')
            ->assertStatus(200)
            ->assertJsonPath('data.count', 1);
    }
}
