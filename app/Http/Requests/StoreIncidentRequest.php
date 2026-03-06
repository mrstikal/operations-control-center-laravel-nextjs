<?php

namespace App\Http\Requests;

use App\Rules\ExistsInTenant;
use App\Services\Tenancy\TenantAccessService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIncidentRequest extends FormRequest
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
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'required|string|max:100',
            'severity' => 'required|in:low,medium,high,critical',
            'priority' => 'required|in:low,medium,high,critical',
            'tenant_id' => [
                'nullable',
                'integer',
                'exists:tenants,id',
                Rule::prohibitedIf(fn () => ! $this->user()?->isAdmin()),
            ],
            'assigned_to' => [
                'nullable',
                new ExistsInTenant('users', 'id', $tenantId),
            ],
            'contract_id' => [
                'nullable',
                new ExistsInTenant('contracts', 'id', $tenantId),
            ],
            'asset_id' => [
                'nullable',
                new ExistsInTenant('assets', 'id', $tenantId),
            ],
            'sla_response_minutes' => 'nullable|integer|min:5',
            'sla_resolution_minutes' => 'nullable|integer|min:30',
            'tags' => 'nullable|json',
        ];
    }

    /**
     * Get custom messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Název incidentu je povinný',
            'description.required' => 'Popis incidentu je povinný',
            'severity.required' => 'Závažnost je povinná',
            'priority.required' => 'Priorita je povinná',
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
