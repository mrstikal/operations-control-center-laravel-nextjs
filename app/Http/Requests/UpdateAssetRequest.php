<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAssetRequest extends FormRequest
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
        return [
            'name' => 'sometimes|string|max:255',
            'serial_number' => 'sometimes|string|unique:assets,serial_number,' . $this->asset->id,
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:100',
            'manufacturer' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'acquisition_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
            'status' => 'sometimes|in:operational,maintenance,repair,retired,disposed',
            'utilization_percent' => 'sometimes|numeric|min:0|max:100',
            'maintenance_interval_days' => 'nullable|integer|min:1',
            'specifications' => 'nullable|json',
            'custom_fields' => 'nullable|json',
        ];
    }
}

