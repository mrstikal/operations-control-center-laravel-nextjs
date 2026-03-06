<?php

namespace App\Http\Resources;

use App\Models\MaintenanceLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MaintenanceLog
 */
class MaintenanceLogResource extends JsonResource
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
            'performed_by' => $this->performed_by,
            'performed_by_user' => $this->whenLoaded('performedBy', function () {
                if (! $this->performedBy instanceof \App\Models\User) {
                    return null;
                }

                return [
                    'id' => $this->performedBy->id,
                    'name' => $this->performedBy->name,
                ];
            }),
            'type' => $this->type,
            'description' => $this->description,
            'hours_spent' => $this->hours_spent === null ? null : (float) $this->hours_spent,
            'cost' => $this->cost === null ? null : (float) $this->cost,
            'performed_at' => $this->performed_at->toIso8601String(),
            'notes' => $this->notes,
            'parts_replaced' => $this->parts_replaced,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
