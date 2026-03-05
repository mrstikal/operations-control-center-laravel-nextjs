<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * UserResource - API Resource pro User model
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
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'employee_id' => $this->employee_id,
            'phone' => $this->phone,
            'bio' => $this->bio,
            'avatar_url' => $this->avatar_url,
            'status' => $this->status,
            'role' => $this->role,
            'roles' => $this->whenLoaded('roles', function () {
                return $this->roles->map(function ($role) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'level' => $role->level,
                        'description' => $role->description,
                    ];
                });
            }),
            'employee_profile' => $this->whenLoaded('employeeProfile', function () {
                return $this->employeeProfile ? [
                    'id' => $this->employeeProfile->id,
                    'department' => $this->employeeProfile->department,
                    'position' => $this->employeeProfile->position,
                    'availability_status' => $this->employeeProfile->availability_status,
                    'available_hours_per_week' => $this->employeeProfile->available_hours_per_week,
                    'utilization_percent' => (float) $this->employeeProfile->utilization_percent,
                ] : null;
            }),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}

