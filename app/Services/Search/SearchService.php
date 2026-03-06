<?php

namespace App\Services\Search;

use App\Models\SearchIndex;
use App\Models\SearchQuery;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;

class SearchService
{
    private const TYPE_RESOURCE_MAP = [
        'contract' => 'contracts',
        'incident' => 'incidents',
        'asset' => 'assets',
    ];

    /**
     * @param  list<string>|null  $requestedTypes
     */
    public function search(User $user, string $term, ?int $tenantId, int $perPage = 15, ?array $requestedTypes = null): LengthAwarePaginator
    {
        $normalizedTerm = trim($term);
        if ($normalizedTerm === '') {
            return $this->emptyPaginator($perPage);
        }

        $allowedTypes = $this->resolveAllowedTypes($user, $requestedTypes);
        if ($allowedTypes === []) {
            return $this->emptyPaginator($perPage);
        }

        $start = microtime(true);

        $query = SearchIndex::query()
            ->whereIn('indexable_type', $allowedTypes);

        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }

        $query = $this->applySearchTerm($query, $normalizedTerm)
            ->orderByDesc('updated_at');

        $paginator = $query->paginate($perPage);

        $this->logSearch(
            user: $user,
            tenantId: $tenantId,
            term: $normalizedTerm,
            resultsCount: $paginator->total(),
            executionTimeMs: (microtime(true) - $start) * 1000,
        );

        return $paginator;
    }

    /**
     * @param  list<string>|null  $requestedTypes
     * @return list<string>
     */
    private function resolveAllowedTypes(User $user, ?array $requestedTypes): array
    {
        $typesToCheck = $requestedTypes ?: array_keys(self::TYPE_RESOURCE_MAP);

        return collect($typesToCheck)
            ->filter(fn ($type) => isset(self::TYPE_RESOURCE_MAP[$type]))
            ->filter(fn ($type) => $user->hasPermission(self::TYPE_RESOURCE_MAP[$type], 'view'))
            ->values()
            ->all();
    }

    private function applySearchTerm(Builder $query, string $term): Builder
    {
        $driver = $query->getModel()->getConnection()->getDriverName();

        if ($driver === 'mysql') {
            return $query
                ->whereRaw('MATCH(searchable_text) AGAINST(? IN BOOLEAN MODE)', [$term])
                ->orderByRaw('MATCH(searchable_text) AGAINST(?) DESC', [$term]);
        }

        return $query->where('searchable_text', 'like', '%'.$term.'%');
    }

    private function emptyPaginator(int $perPage): LengthAwarePaginator
    {
        $currentPage = max((int) request('page', 1), 1);

        return new LengthAwarePaginator([], 0, $perPage, $currentPage);
    }

    private function logSearch(User $user, ?int $tenantId, string $term, int $resultsCount, float $executionTimeMs): void
    {
        SearchQuery::query()->create([
            'tenant_id' => $tenantId ?? (int) $user->tenant_id,
            'user_id' => $user->id,
            'query' => $term,
            'results_count' => $resultsCount,
            'execution_time_ms' => round($executionTimeMs, 2),
            'searched_at' => now(),
        ]);
    }
}
