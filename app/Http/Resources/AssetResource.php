<?php

namespace App\Http\Resources;

use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * AssetResource - API Resource pro Asset model
 *
 * @mixin Asset
 */
class AssetResource extends JsonResource
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
            'asset_tag' => $this->asset_tag,
            'name' => $this->name,
            'serial_number' => $this->serial_number,
            'description' => $this->description,
            'category' => $this->whenLoaded('category', function () {
                return [
                    'id' => $this->category->id,
                    'name' => $this->category->name,
                ];
            }),
            'location' => $this->location,
            'department' => $this->department,
            'assigned_to_id' => $this->assigned_to,
            'assigned_to' => $this->whenLoaded('assignedTo', function () {
                return $this->assignedTo ? [
                    'id' => $this->assignedTo->id,
                    'name' => $this->assignedTo->name,
                ] : null;
            }),
            'manufacturer' => $this->manufacturer,
            'model' => $this->model,
            'acquisition_date' => $this->acquisition_date?->toDateString(),
            'warranty_expiry' => $this->warranty_expiry?->toDateString(),
            'status' => $this->status,
            'utilization_percent' => (float) $this->utilization_percent,
            'last_maintenance' => $this->last_maintenance?->toIso8601String(),
            'next_maintenance' => $this->next_maintenance?->toIso8601String(),
            'maintenance_interval_days' => $this->maintenance_interval_days,
            'is_due_for_maintenance' => $this->isDueForMaintenance(),
            'is_warranty_expired' => $this->isWarrantyExpired(),
            'days_until_maintenance' => $this->daysUntilMaintenance(),
            'specifications' => $this->specifications ?? [],
            'tenant' => $this->whenLoaded('tenant', function () {
                return $this->tenant ? [
                    'id' => $this->tenant->id,
                    'name' => $this->tenant->name,
                    'deleted_at' => $this->tenant->deleted_at?->toIso8601String(),
                ] : null;
            }),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
