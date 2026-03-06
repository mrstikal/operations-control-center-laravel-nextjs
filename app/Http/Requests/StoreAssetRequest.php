<?php

namespace App\Http\Requests;

use App\Rules\ExistsInTenant;
use App\Services\Tenancy\TenantAccessService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetRequest extends FormRequest
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
                'nullable',
                'integer',
                'exists:tenants,id',
                Rule::prohibitedIf(fn () => ! $this->user()?->isAdmin()),
            ],
            'category_id' => [
                'required',
                new ExistsInTenant('asset_categories', 'id', $tenantId),
            ],
            'name' => 'required|string|max:255',
            'asset_tag' => 'required|string|unique:assets,asset_tag',
            'serial_number' => 'nullable|string|unique:assets,serial_number',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:100',
            'manufacturer' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'acquisition_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
            'maintenance_interval_days' => 'nullable|integer|min:1',
            'specifications' => 'nullable|json',
            'custom_fields' => 'nullable|json',
        ];
    }

    /**
     * Get custom messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'category_id.required' => 'Kategorie je povinná',
            'name.required' => 'Název asetu je povinný',
            'asset_tag.required' => 'Asset tag je povinný',
            'asset_tag.unique' => 'The asset tag has already been taken.',
        ];
    }

    private function resolvedTenantId(): int
    {
        $user = $this->user();
        if (! $user) {
            return 0;
        }

        return app(TenantAccessService::class)->resolveTenantId($user, $this);
    }
}
