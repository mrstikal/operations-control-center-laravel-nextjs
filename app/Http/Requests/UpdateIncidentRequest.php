<?php

namespace App\Http\Requests;

use App\Rules\ExistsInTenant;
use App\Services\Tenancy\TenantAccessService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIncidentRequest extends FormRequest
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
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'category' => 'sometimes|string|max:100',
            'severity' => 'sometimes|in:low,medium,high,critical',
            'priority' => 'sometimes|in:low,medium,high,critical',
            'status' => 'sometimes|in:open,in_progress,escalated,resolved,closed',
            'tenant_id' => [
                'sometimes',
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
            'tags' => 'nullable|json',
        ];
    }

    private function resolvedTenantId(): int
    {
        $user = $this->user();
        if (! $user) {
            return 0;
        }

        $routeIncident = $this->route('incident');
        $routeTenantId = (int) data_get($routeIncident, 'tenant_id', 0);

        return app(TenantAccessService::class)->resolveTenantId(
            $user,
            $this,
            $routeTenantId > 0 ? $routeTenantId : null
        );
    }
}
