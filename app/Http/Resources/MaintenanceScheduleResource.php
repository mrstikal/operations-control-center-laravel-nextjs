<?php

namespace App\Http\Resources;

use App\Models\MaintenanceSchedule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MaintenanceSchedule
 */
class MaintenanceScheduleResource extends JsonResource
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
            'asset_id' => $this->asset_id,
            'asset' => $this->whenLoaded('asset', function () {
                if (! $this->asset instanceof \App\Models\Asset) {
                    return null;
                }

                return [
                    'id' => $this->asset->id,
                    'name' => $this->asset->name,
                    'asset_tag' => $this->asset->asset_tag,
                ];
            }),
            'frequency' => $this->frequency,
            'interval_days' => $this->interval_days,
            'description' => $this->description,
            'next_due_date' => $this->next_due_date->toIso8601String(),
            'is_active' => $this->is_active,
            'due_state' => $this->due_state ?? 'ok',
            'is_overdue' => $this->isOverdue(),
            'days_until_due' => $this->daysUntilDue(),
            'last_notified_at' => $this->last_notified_at?->toIso8601String(),
            'notification_settings' => $this->notification_settings,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
