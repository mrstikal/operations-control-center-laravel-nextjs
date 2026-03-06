<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * UserResource - API Resource pro User model
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var \App\Models\User $user */
        $user = $this->resource;

        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'name' => $this->name,
            'email' => $this->email,
            'employee_id' => $this->employee_id,
            'phone' => $this->phone,
            'bio' => $this->bio,
            'avatar_url' => $this->avatar_url,
            'status' => $this->status,
            'role' => $user->getAttribute('role'),
            'roles' => $this->whenLoaded('roles', function () use ($user) {
                return $user->roles->map(function ($role) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'level' => $role->level,
                        'description' => $role->description,
                    ];
                })->all();
            }),
            'permissions' => $this->whenLoaded('roles', function () use ($user) {
                // Gather unique permissions from all roles
                $permissions = collect();
                foreach ($user->roles as $role) {
                    $rolePermissions = $role->permissions;
                    if ($rolePermissions->isNotEmpty()) {
                        foreach ($rolePermissions as $permission) {
                            $resource = $permission->getAttribute('resource');
                            $action = $permission->getAttribute('action');

                            // Avoid duplicates by resource+action
                            if (! $permissions->contains(function ($p) use ($resource, $action) {
                                return $p->getAttribute('resource') === $resource
                                    && $p->getAttribute('action') === $action;
                            })) {
                                $permissions->push($permission);
                            }
                        }
                    }
                }

                return $permissions->map(function ($permission) {
                    return [
                        'id' => $permission->id,
                        'resource' => $permission->resource,
                        'action' => $permission->action,
                        'name' => $permission->name,
                        'description' => $permission->description,
                    ];
                })->values();
            }),
            'employee_profile' => $this->whenLoaded('employeeProfile', function () use ($user) {
                $profile = $user->employeeProfile;

                return $profile ? [
                    'id' => $profile->id,
                    'department' => $profile->department,
                    'position' => $profile->position,
                    'availability_status' => $profile->availability_status,
                    'available_hours_per_week' => $profile->available_hours_per_week,
                    'utilization_percent' => (float) $profile->utilization_percent,
                ] : null;
            }),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
