<?php

namespace App\Http\Resources;

use App\Models\Incident;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * IncidentResource - API Resource pro Incident model
 *
 * @mixin Incident
 */
class IncidentResource extends JsonResource
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
            'incident_number' => $this->incident_number,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'severity' => $this->severity,
            'priority' => $this->priority,
            'status' => $this->status,
            'tenant' => $this->whenLoaded('tenant', function () {
                return $this->tenant ? [
                    'id' => $this->tenant->id,
                    'name' => $this->tenant->name,
                    'deleted_at' => $this->tenant->deleted_at?->toIso8601String(),
                ] : null;
            }),
            'reported_by' => $this->whenLoaded('reportedBy', function () {
                return $this->reportedBy ? [
                    'id' => $this->reportedBy->id,
                    'name' => $this->reportedBy->name,
                    'email' => $this->reportedBy->email,
                ] : null;
            }),
            'assigned_to' => $this->whenLoaded('assignedTo', function () {
                return [
                    'id' => $this->assignedTo->id,
                    'name' => $this->assignedTo->name,
                    'email' => $this->assignedTo->email,
                ];
            }),
            'escalated_to' => $this->whenLoaded('escalatedTo', function () {
                return $this->escalatedTo ? [
                    'id' => $this->escalatedTo->id,
                    'name' => $this->escalatedTo->name,
                ] : null;
            }),
            'contract' => $this->whenLoaded('contract', function () {
                return $this->contract ? [
                    'id' => $this->contract->id,
                    'contract_number' => $this->contract->contract_number,
                    'title' => $this->contract->title,
                ] : null;
            }),
            'asset' => $this->whenLoaded('asset', function () {
                return $this->asset ? [
                    'id' => $this->asset->id,
                    'asset_tag' => $this->asset->asset_tag,
                    'name' => $this->asset->name,
                ] : null;
            }),
            'reported_at' => $this->reported_at->toIso8601String(),
            'acknowledged_at' => $this->acknowledged_at?->toIso8601String(),
            'started_at' => $this->started_at?->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'sla_response_deadline' => $this->sla_response_deadline?->toIso8601String(),
            'sla_resolution_deadline' => $this->sla_resolution_deadline?->toIso8601String(),
            'sla_breached' => $this->sla_breached,
            'time_elapsed_minutes' => $this->timeElapsed(),
            'remaining_sla_time' => $this->remainingSlaTime(),
            'resolution_summary' => $this->resolution_summary,
            'tags' => $this->tags ?? [],
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
