<?php

namespace App\Http\Requests;

use App\Services\Tenancy\TenantAccessService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNotificationScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->resolvedTenantId();

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('notification_schedules')->where('tenant_id', $tenantId),
            ],
            'notification_type' => 'required|string|max:100',
            'trigger' => ['required', 'string', Rule::in([
                'incident_assigned',
                'sla_breach',
                'maintenance_due',
                'contract_status_changed',
                'asset_retired',
            ])],
            'conditions' => 'nullable|array',
            'conditions.schema_version' => 'required_with:conditions|integer|in:1',
            'conditions.rules' => 'nullable|array',
            'conditions.rules.*.field' => 'required_with:conditions.rules|string|max:100',
            'conditions.rules.*.operator' => [
                'required_with:conditions.rules',
                Rule::in(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'exists']),
            ],
            'conditions.rules.*.value' => 'present',
            'conditions.window' => 'nullable|array',
            'conditions.window.lookback_minutes' => 'nullable|integer|min:1|max:10080',

            'recipients' => 'required|array',
            'recipients.schema_version' => 'required|integer|in:1',
            'recipients.roles' => 'nullable|array',
            'recipients.roles.*' => 'string|max:50',
            'recipients.user_ids' => 'nullable|array',
            'recipients.user_ids.*' => 'integer|exists:users,id',
            'recipients.channels' => 'required|array|min:1',
            'recipients.channels.*' => Rule::in(['in_app']),
            'recipients.dedupe' => 'nullable|array',
            'recipients.dedupe.strategy' => [
                'nullable',
                Rule::in(['per_user_per_trigger', 'global_per_trigger']),
            ],
            'recipients.dedupe.ttl_minutes' => 'nullable|integer|min:1|max:10080',

            'is_active' => 'boolean',

            'tenant_id' => [
                'nullable',
                'integer',
                'exists:tenants,id',
                Rule::prohibitedIf(fn () => ! $this->user()?->isAdmin()),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Schedule name is required.',
            'name.unique' => 'A schedule with this name already exists within the tenant.',
            'trigger.required' => 'Trigger is required.',
            'trigger.in' => 'Invalid trigger. Allowed values: incident_assigned, sla_breach, maintenance_due, contract_status_changed, asset_retired.',
            'recipients.required' => 'The recipients field is required.',
            'recipients.schema_version.required' => 'The recipients schema version is required.',
            'recipients.channels.required' => 'At least one delivery channel is required.',
            'recipients.channels.*.in' => 'Invalid channel. Allowed values: in_app.',
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
