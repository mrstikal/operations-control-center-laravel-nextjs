<?php

namespace App\Listeners;

use App\Events\IncidentUpdated;
use App\Jobs\DispatchTriggerNotificationsJob;
use App\Models\Incident;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Listens to IncidentUpdated events and dispatches notification jobs
 * for the `incident_assigned` trigger when the assigned_to field changes.
 */
class TriggerIncidentNotifications implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(IncidentUpdated $event): void
    {
        $incident = $event->incident;
        $action = $event->action;
        $changes = $event->changes;

        // incident_assigned: fires when assigned_to is set or changed
        if ($this->isAssignmentChange($action, $changes) && $incident->assigned_to) {
            DispatchTriggerNotificationsJob::dispatch(
                trigger: 'incident_assigned',
                tenantId: (int) $incident->tenant_id,
                context: [
                    'severity' => $incident->severity,
                    'priority' => $incident->priority,
                    'status' => $incident->status,
                    'assigned_to' => $incident->assigned_to,
                    'incident_id' => $incident->id,
                ],
                title: 'Incident assigned',
                message: "Incident '{$incident->title}' ({$incident->incident_number}) was assigned and is awaiting processing.",
                priority: in_array($incident->severity, ['critical', 'high']) ? 'high' : 'medium',
                notifiableType: Incident::class,
                notifiableId: (int) $incident->id,
                actionUrl: "/incidents/{$incident->id}",
                data: ['incident_number' => $incident->incident_number],
            );
        }
    }

    private function isAssignmentChange(string $action, array $changes): bool
    {
        if ($action === 'assigned') {
            return true;
        }

        // Detect assigned_to change within generic update
        return $action === 'updated' && array_key_exists('assigned_to', $changes);
    }
}
