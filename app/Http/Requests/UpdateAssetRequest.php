<?php

namespace App\Http\Requests;

use App\Rules\ExistsInTenant;
use App\Services\Tenancy\TenantAccessService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $tenantId = $this->resolvedTenantId();

        return [
            'tenant_id' => [
                'sometimes',
                'integer',
                'exists:tenants,id',
                Rule::prohibitedIf(fn () => ! $this->user()?->isAdmin()),
            ],
            'name' => 'sometimes|string|max:255',
            'asset_tag' => 'sometimes|string|max:100|unique:assets,asset_tag,'.$this->asset->id,
            'serial_number' => 'sometimes|string|unique:assets,serial_number,'.$this->asset->id,
            'description' => 'nullable|string',
            'category_id' => [
                'sometimes',
                new ExistsInTenant('asset_categories', 'id', $tenantId),
            ],
            'location' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:100',
            'manufacturer' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'acquisition_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
            'status' => 'sometimes|in:operational,maintenance,repair,retired,disposed',
            'utilization_percent' => 'sometimes|numeric|min:0|max:100',
            'maintenance_interval_days' => 'nullable|integer|min:1',
            'specifications' => 'nullable|json',
            'custom_fields' => 'nullable|json',
        ];
    }

    private function resolvedTenantId(): int
    {
        $user = $this->user();
        if (! $user) {
            return 0;
        }

        $routeAsset = $this->route('asset');
        $routeTenantId = (int) data_get($routeAsset, 'tenant_id', 0);

        return app(TenantAccessService::class)->resolveTenantId(
            $user,
            $this,
            $routeTenantId > 0 ? $routeTenantId : null
        );
    }
}
