<?php

namespace App\Http\Requests;

use App\Rules\ExistsInTenant;
use App\Services\Tenancy\TenantAccessService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContractRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization je v controlleru
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $tenantId = $this->resolvedTenantId();

        return [
            'contract_number' => 'required|string|unique:contracts,contract_number',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'tenant_id' => [
                'nullable',
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
            'priority' => 'required|in:low,medium,high,critical',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'sla_hours' => 'nullable|integer|min:1',
            'budget' => 'nullable|numeric|min:0',
            'tags' => 'nullable|json',
            'custom_fields' => 'nullable|json',
        ];
    }

    /**
     * Get custom messages for validation rules.
     */
    public function messages(): array
    {
        return [
            'contract_number.required' => 'Contract number je povinný',
            'contract_number.unique' => 'Toto číslo kontraktu již existuje',
            'title.required' => 'Název je povinný',
            'due_date.after_or_equal' => 'Konečný termín musí být po/rovno počátečnímu termínu',
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
