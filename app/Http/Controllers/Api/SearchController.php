<?php

namespace App\Http\Controllers\Api;

use App\Services\Search\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SearchController extends BaseApiController
{
    public function index(Request $request, SearchService $searchService): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:255'],
            'types' => ['nullable', 'array'],
            'types.*' => ['in:contract,incident,asset'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $tenantId = $this->getOptionalTenantId();

        $results = $searchService->search(
            user: $request->user(),
            term: $validated['q'],
            tenantId: $tenantId,
            perPage: (int) ($validated['per_page'] ?? 15),
            requestedTypes: $validated['types'] ?? null,
        );

        $mappedItems = $results->getCollection()->map(function ($item): array {
            return [
                'id' => $item->id,
                'tenant_id' => $item->tenant_id,
                'type' => $item->indexable_type,
                'indexable_id' => $item->indexable_id,
                'title' => data_get($item->metadata, 'title'),
                'subtitle' => data_get($item->metadata, 'subtitle'),
                'status' => data_get($item->metadata, 'status'),
                'action_url' => data_get($item->metadata, 'action_url'),
                'snippet' => Str::limit($item->searchable_text, 180),
                'indexed_at' => $item->indexed_at?->toIso8601String(),
                'updated_at' => $item->updated_at?->toIso8601String(),
            ];
        });

        $results->setCollection($mappedItems);

        return $this->paginated($results, 'Search results retrieved successfully');
    }
}
