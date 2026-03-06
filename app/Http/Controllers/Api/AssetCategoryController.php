<?php

namespace App\Http\Controllers\Api;

use App\Models\AssetCategory;
use Illuminate\Http\JsonResponse;

/**
 * AssetCategoryController - REST API for Asset Categories.
 */
class AssetCategoryController extends BaseApiController
{
    /**
     * GET /api/asset-categories
     * List all asset categories for the current tenant.
     */
    public function index(): JsonResponse
    {
        $categories = AssetCategory::ofTenant($this->getTenantId())
            ->orderBy('name')
            ->get(['id', 'name', 'description']);

        return $this->success($categories, 'Asset categories retrieved successfully');
    }
}
