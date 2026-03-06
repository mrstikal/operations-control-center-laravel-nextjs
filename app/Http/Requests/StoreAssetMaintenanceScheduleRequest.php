<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetMaintenanceScheduleRequest extends FormRequest
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
            'frequency' => ['required', Rule::in(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])],
            'interval_days' => ['nullable', 'integer', 'min:1'],
            'description' => ['required', 'string'],
            'next_due_date' => ['nullable', 'date', 'after_or_equal:today'],
            'is_active' => ['nullable', 'boolean'],
            'notification_settings' => ['nullable', 'array'],
        ];
    }
}
