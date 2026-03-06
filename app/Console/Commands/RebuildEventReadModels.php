<?php

namespace App\Console\Commands;

use App\Services\EventStore\EventReadModelService;
use Illuminate\Console\Command;

class RebuildEventReadModels extends Command
{
    protected $signature = 'events:rebuild-read-models {--tenant= : Rebuild only one tenant by tenant_id}';

    protected $description = 'Rebuild event projections and snapshots from the events table';

    public function handle(EventReadModelService $readModelService): int
    {
        if (! $readModelService->tablesAvailable()) {
            $this->warn('Events/read-model tables are not available, skipping rebuild.');

            return self::SUCCESS;
        }

        $tenantOption = $this->option('tenant');
        $tenantId = is_numeric($tenantOption) ? (int) $tenantOption : null;
        $scope = $tenantId !== null ? "tenant {$tenantId}" : 'all tenants';

        $stats = $readModelService->rebuild($tenantId);

        $this->info("Event read models rebuilt for {$scope}.");
        $this->line("Processed events: {$stats['events']}");
        $this->line("Active projections: {$stats['projections']}");
        $this->line("Stored snapshots: {$stats['snapshots']}");

        return self::SUCCESS;
    }
}
