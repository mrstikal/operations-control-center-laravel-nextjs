<?php

namespace App\Listeners;

use App\Events\ContractUpdated;
use App\Jobs\DispatchTriggerNotificationsJob;
use App\Models\Contract;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Listens to ContractUpdated events and dispatches notification jobs
 * for the `contract_status_changed` trigger when contract status changes.
 */
class TriggerContractNotifications implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(ContractUpdated $event): void
    {
        $contract = $event->contract;
        $action = $event->action;
        $changes = $event->changes;

        if ($this->isStatusChange($action, $changes)) {
            $newStatus = $changes['status']['new'] ?? $changes['status'] ?? $contract->status;

            DispatchTriggerNotificationsJob::dispatch(
                trigger: 'contract_status_changed',
                tenantId: (int) $contract->tenant_id,
                context: [
                    'status' => $newStatus,
                    'priority' => $contract->priority,
                    'sla_status' => $contract->sla_status,
                    'contract_id' => $contract->id,
                ],
                title: 'Contract status changed',
                message: "Contract '{$contract->title}' ({$contract->contract_number}) status was changed to: {$newStatus}.",
                priority: $contract->priority === 'critical' ? 'high' : 'medium',
                notifiableType: Contract::class,
                notifiableId: (int) $contract->id,
                actionUrl: "/contracts/{$contract->id}",
                data: [
                    'contract_number' => $contract->contract_number,
                    'new_status' => $newStatus,
                ],
            );
        }
    }

    private function isStatusChange(string $action, array $changes): bool
    {
        if ($action === 'status_changed') {
            return true;
        }

        return $action === 'updated' && array_key_exists('status', $changes);
    }
}
