<?php

namespace App\Services\Incidents;

use App\Models\Incident;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * IncidentService – business logic for incident lifecycle operations.
 *
 * Extracted from IncidentController to satisfy SRP.
 */
class IncidentService
{
    public function __construct(private readonly IncidentNumberService $incidentNumberService) {}

    /**
     * Create an incident, retrying up to $maxAttempts times on incident_number
     * UNIQUE constraint collisions.
     */
    public function createWithUniqueNumber(int $tenantId, array $validated, User $actor): Incident
    {
        $maxAttempts = 5;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $incident = DB::transaction(function () use ($tenantId, $validated, $actor) {
                    $lastIncident = Incident::ofTenant($tenantId)
                        ->select('incident_number')
                        ->orderByDesc('id')
                        ->lockForUpdate()
                        ->first();

                    $data = [
                        'tenant_id' => $tenantId,
                        'incident_number' => $this->incidentNumberService->nextIncidentNumber(
                            $lastIncident?->incident_number
                        ),
                        'reported_by' => $actor->id,
                        'title' => $validated['title'],
                        'description' => $validated['description'],
                        'category' => $validated['category'],
                        'severity' => $validated['severity'],
                        'priority' => $validated['priority'],
                        'status' => 'open',
                        'reported_at' => now(),
                    ];

                    foreach (['assigned_to', 'contract_id', 'asset_id', 'sla_response_minutes', 'sla_resolution_minutes', 'tags'] as $optional) {
                        if (! empty($validated[$optional])) {
                            $data[$optional] = in_array($optional, ['assigned_to', 'contract_id', 'asset_id', 'sla_response_minutes', 'sla_resolution_minutes'], true)
                                ? (int) $validated[$optional]
                                : $validated[$optional];
                        }
                    }

                    return Incident::create($data);
                });

                // Sync assignment history when an assignee was set on creation.
                if (! empty($incident->assigned_to)) {
                    $assignee = User::find($incident->assigned_to);
                    if ($assignee) {
                        $incident->assignTo($assignee, $actor, 'primary', 'Assigned on incident creation');
                    }
                }

                $incident->addTimelineEvent($actor, 'created', 'Incident created', ['status' => $incident->status]);

                return $incident;

            } catch (QueryException $e) {
                if (! $this->incidentNumberService->isIncidentNumberCollision($e) || $attempt === $maxAttempts) {
                    throw $e;
                }
            }
        }

        throw new \RuntimeException('Unable to allocate incident number after '.$maxAttempts.' attempts');
    }

    /**
     * Close an incident within a DB transaction and record timeline event.
     */
    public function close(Incident $incident, array $validated, User $actor): void
    {
        DB::transaction(function () use ($incident, $validated, $actor): void {
            $incident->update([
                'status' => 'closed',
                'closed_at' => now(),
                'resolution_summary' => $validated['resolution_summary'],
            ]);

            $incident->addTimelineEvent($actor, 'status_changed', 'Incident closed', ['status' => 'closed']);
        });
    }

    /**
     * Escalate an incident within a DB transaction.
     */
    public function escalate(Incident $incident, array $validated, User $actor): void
    {
        $escalatedTo = User::find($validated['escalated_to']);

        DB::transaction(function () use ($incident, $validated, $actor, $escalatedTo): void {
            $incident->escalate(
                $actor,
                $escalatedTo,
                $validated['escalation_level'],
                $validated['reason'],
                $validated['notes'] ?? null
            );
        });
    }
}
