<?php

namespace App\Observers;

use App\Models\Asset;
use App\Services\Search\SearchIndexerService;

class AssetObserver
{
    public function saved(Asset $asset): void
    {
        app(SearchIndexerService::class)->indexAsset($asset);
    }

    public function restored(Asset $asset): void
    {
        app(SearchIndexerService::class)->indexAsset($asset);
    }

    public function deleted(Asset $asset): void
    {
        app(SearchIndexerService::class)->remove('asset', (int) $asset->id);
    }

    public function forceDeleted(Asset $asset): void
    {
        app(SearchIndexerService::class)->remove('asset', (int) $asset->id);
    }
}
