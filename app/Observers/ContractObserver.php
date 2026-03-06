<?php

namespace App\Observers;

use App\Models\Contract;
use App\Services\Search\SearchIndexerService;

class ContractObserver
{
    public function saved(Contract $contract): void
    {
        app(SearchIndexerService::class)->indexContract($contract);
    }

    public function restored(Contract $contract): void
    {
        app(SearchIndexerService::class)->indexContract($contract);
    }

    public function deleted(Contract $contract): void
    {
        app(SearchIndexerService::class)->remove('contract', (int) $contract->id);
    }

    public function forceDeleted(Contract $contract): void
    {
        app(SearchIndexerService::class)->remove('contract', (int) $contract->id);
    }
}
