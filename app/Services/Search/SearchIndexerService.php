<?php

namespace App\Services\Search;

use App\Models\Asset;
use App\Models\Contract;
use App\Models\Incident;
use App\Models\SearchIndex;
use Illuminate\Support\Collection;

class SearchIndexerService
{
    /**
     * @var array<string, class-string>
     */
    private const TYPE_TO_MODEL = [
        'contract' => Contract::class,
        'incident' => Incident::class,
        'asset' => Asset::class,
    ];

    public function indexContract(Contract $contract): void
    {
        $this->upsertDocument(
            tenantId: (int) $contract->tenant_id,
            type: 'contract',
            indexableId: (int) $contract->id,
            searchableText: implode(' ', array_filter([
                $contract->contract_number,
                $contract->title,
                $contract->description,
                $contract->priority,
                $contract->status,
            ])),
            metadata: [
                'title' => $contract->title,
                'subtitle' => $contract->contract_number,
                'status' => $contract->status,
                'priority' => $contract->priority,
                'action_url' => '/contracts/'.$contract->id,
            ],
        );
    }

    public function indexIncident(Incident $incident): void
    {
        $this->upsertDocument(
            tenantId: (int) $incident->tenant_id,
            type: 'incident',
            indexableId: (int) $incident->id,
            searchableText: implode(' ', array_filter([
                $incident->incident_number,
                $incident->title,
                $incident->description,
                $incident->category,
                $incident->severity,
                $incident->priority,
                $incident->status,
            ])),
            metadata: [
                'title' => $incident->title,
                'subtitle' => $incident->incident_number,
                'status' => $incident->status,
                'severity' => $incident->severity,
                'priority' => $incident->priority,
                'action_url' => '/incidents/'.$incident->id,
            ],
        );
    }

    public function indexAsset(Asset $asset): void
    {
        $this->upsertDocument(
            tenantId: (int) $asset->tenant_id,
            type: 'asset',
            indexableId: (int) $asset->id,
            searchableText: implode(' ', array_filter([
                $asset->asset_tag,
                $asset->serial_number,
                $asset->name,
                $asset->description,
                $asset->location,
                $asset->department,
                $asset->manufacturer,
                $asset->model,
                $asset->status,
            ])),
            metadata: [
                'title' => $asset->name,
                'subtitle' => $asset->asset_tag,
                'status' => $asset->status,
                'department' => $asset->department,
                'action_url' => '/assets/'.$asset->id,
            ],
        );
    }

    public function remove(string $type, int $indexableId): void
    {
        SearchIndex::query()
            ->where('indexable_type', $type)
            ->where('indexable_id', $indexableId)
            ->delete();
    }

    /**
     * @return array<string, int>
     */
    public function reindex(?int $tenantId = null, ?string $type = null, int $chunk = 200): array
    {
        $types = $type ? [$type] : array_keys(self::TYPE_TO_MODEL);
        $results = [
            'contract' => 0,
            'incident' => 0,
            'asset' => 0,
        ];

        foreach ($types as $currentType) {
            if (! isset(self::TYPE_TO_MODEL[$currentType])) {
                continue;
            }

            $modelClass = self::TYPE_TO_MODEL[$currentType];
            $query = $modelClass::query();

            if ($tenantId !== null) {
                $query->where('tenant_id', $tenantId);
            }

            $query->chunkById($chunk, function (Collection $models) use (&$results, $currentType): void {
                foreach ($models as $model) {
                    if ($currentType === 'contract' && $model instanceof Contract) {
                        $this->indexContract($model);
                    }

                    if ($currentType === 'incident' && $model instanceof Incident) {
                        $this->indexIncident($model);
                    }

                    if ($currentType === 'asset' && $model instanceof Asset) {
                        $this->indexAsset($model);
                    }

                    $results[$currentType]++;
                }
            });
        }

        return $results;
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private function upsertDocument(
        int $tenantId,
        string $type,
        int $indexableId,
        string $searchableText,
        array $metadata,
    ): void {
        SearchIndex::query()->updateOrCreate(
            [
                'indexable_type' => $type,
                'indexable_id' => $indexableId,
            ],
            [
                'tenant_id' => $tenantId,
                'searchable_text' => trim($searchableText),
                'metadata' => $metadata,
                'indexed_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
