<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssetMaintenanceLogRequest extends FormRequest
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
            'type' => ['sometimes', Rule::in(['preventive', 'corrective', 'inspection', 'repair'])],
            'description' => ['sometimes', 'string'],
            'hours_spent' => ['sometimes', 'nullable', 'numeric', 'min:0.5'],
            'cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'performed_at' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'parts_replaced' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
