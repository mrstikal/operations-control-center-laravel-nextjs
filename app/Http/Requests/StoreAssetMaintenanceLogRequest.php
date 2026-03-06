<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetMaintenanceLogRequest extends FormRequest
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
            'type' => ['required', Rule::in(['preventive', 'corrective', 'inspection', 'repair'])],
            'description' => ['required', 'string'],
            'hours_spent' => ['nullable', 'numeric', 'min:0.5'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'performed_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'parts_replaced' => ['nullable', 'array'],
        ];
    }
}
