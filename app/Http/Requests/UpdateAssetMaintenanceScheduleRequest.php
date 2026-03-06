<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssetMaintenanceScheduleRequest extends FormRequest
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
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'frequency' => ['sometimes', Rule::in(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])],
            'interval_days' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'description' => ['sometimes', 'string'],
            'next_due_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:today'],
            'is_active' => ['sometimes', 'boolean'],
            'notification_settings' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
