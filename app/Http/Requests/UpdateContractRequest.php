<?php

namespace App\Http\Requests;

use App\Rules\ExistsInTenant;
use App\Services\Tenancy\TenantAccessService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContractRequest extends FormRequest
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
        $contractId = (int) data_get($this->route('contract'), 'id', 0);

        return [
            'contract_number' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('contracts', 'contract_number')->ignore($contractId),
            ],
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'tenant_id' => [
                'sometimes',
                'integer',
                'exists:tenants,id',
                Rule::prohibitedIf(fn () => ! $this->user()?->isAdmin()),
            ],
            'client_id' => [
                'nullable',
                new ExistsInTenant('users', 'id', $tenantId),
            ],
            'assigned_to' => [
                'nullable',
                new ExistsInTenant('users', 'id', $tenantId),
            ],
            'status' => 'sometimes|required|in:draft,approved,in_progress,blocked,done',
            'priority' => 'sometimes|in:low,medium,high,critical',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'sla_hours' => 'nullable|integer|min:1',
            'budget' => 'nullable|numeric|min:0',
            'spent' => 'nullable|numeric|min:0',
            'tags' => 'nullable|json',
            'custom_fields' => 'nullable|json',
        ];
    }

    private function resolvedTenantId(): int
    {
        $user = $this->user();
        if (! $user) {
            return 0;
        }

        $routeContract = $this->route('contract');
        $routeTenantId = (int) data_get($routeContract, 'tenant_id', 0);

        return app(TenantAccessService::class)->resolveTenantId(
            $user,
            $this,
            $routeTenantId > 0 ? $routeTenantId : null
        );
    }
}
