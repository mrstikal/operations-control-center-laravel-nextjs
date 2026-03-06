<?php

namespace App\Console\Commands;

use App\Services\Search\SearchIndexerService;
use Illuminate\Console\Command;

class SearchReindexCommand extends Command
{
    protected $signature = 'search:reindex
        {--tenant_id= : Reindex only one tenant}
        {--type= : One of: contract, incident, asset}
        {--chunk=200 : Chunk size for batch processing}';

    protected $description = 'Rebuild records in search_index for contracts, incidents and assets';

    public function handle(SearchIndexerService $indexer): int
    {
        $tenantId = $this->option('tenant_id');
        $tenantId = is_numeric($tenantId) ? (int) $tenantId : null;

        $type = $this->option('type');
        $type = is_string($type) && $type !== '' ? strtolower($type) : null;

        if ($type !== null && ! in_array($type, ['contract', 'incident', 'asset'], true)) {
            $this->error('Invalid --type value. Use: contract, incident, asset');

            return self::INVALID;
        }

        $chunk = max((int) $this->option('chunk'), 1);

        $this->info('Starting search reindex...');

        $results = $indexer->reindex($tenantId, $type, $chunk);

        $this->table(['Type', 'Indexed records'], [
            ['contract', $results['contract'] ?? 0],
            ['incident', $results['incident'] ?? 0],
            ['asset', $results['asset'] ?? 0],
        ]);

        $this->info('Search reindex finished successfully.');

        return self::SUCCESS;
    }
}
