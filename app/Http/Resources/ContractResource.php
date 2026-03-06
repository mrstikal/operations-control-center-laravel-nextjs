<?php

namespace App\Http\Resources;

use App\Models\Contract;
use App\Models\ContractIncident;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ContractResource - API Resource pro Contract model
 *
 * @mixin Contract
 */
class ContractResource extends JsonResource
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
            'contract_number' => $this->contract_number,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'tenant' => $this->whenLoaded('tenant', function () {
                return $this->tenant ? [
                    'id' => $this->tenant->id,
                    'name' => $this->tenant->name,
                    'deleted_at' => $this->tenant->deleted_at?->toIso8601String(),
                ] : null;
            }),
            'client' => $this->whenLoaded('client', function () {
                return [
                    'id' => $this->client->id,
                    'name' => $this->client->name,
                    'email' => $this->client->email,
                ];
            }),
            'assigned_to' => $this->whenLoaded('assignedTo', function () {
                return [
                    'id' => $this->assignedTo->id,
                    'name' => $this->assignedTo->name,
                    'email' => $this->assignedTo->email,
                ];
            }),
            'start_date' => $this->start_date?->toIso8601String(),
            'due_date' => $this->due_date?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'sla_hours' => $this->sla_hours,
            'sla_deadline' => $this->sla_deadline?->toIso8601String(),
            'sla_status' => $this->sla_status,
            'budget' => (float) $this->budget,
            'spent' => (float) $this->spent,
            'remaining_budget' => $this->getRemainingBudget(),
            'budget_usage_percent' => $this->getBudgetUsagePercent(),
            'is_overdue' => $this->isOverdue(),
            'tags' => $this->tags ?? [],
            'incidents_count' => $this->when(isset($this->incidents_count), (int) $this->incidents_count),
            'incidents' => $this->whenLoaded('incidents', function () {
                $mappedIncidents = [];
                foreach ($this->incidents as $incident) {
                    if (! $incident instanceof ContractIncident) {
                        continue;
                    }

                    $mappedIncidents[] = [
                        'id' => $incident->id,
                        'title' => $incident->title,
                        'description' => $incident->description,
                        'severity' => $incident->severity,
                        'status' => $incident->status,
                        'reported_at' => $incident->reported_at->toIso8601String(),
                        'resolved_at' => $incident->resolved_at?->toIso8601String(),
                        'reported_by' => $incident->reportedBy ? [
                            'id' => data_get($incident, 'reportedBy.id'),
                            'name' => data_get($incident, 'reportedBy.name'),
                        ] : null,
                        'assigned_to' => $incident->assignedTo ? [
                            'id' => data_get($incident, 'assignedTo.id'),
                            'name' => data_get($incident, 'assignedTo.name'),
                        ] : null,
                    ];
                }

                return $mappedIncidents;
            }),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
