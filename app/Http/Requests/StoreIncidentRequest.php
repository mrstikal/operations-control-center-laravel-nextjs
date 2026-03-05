<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
        return [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'required|string|max:100',
            'severity' => 'required|in:low,medium,high,critical',
            'priority' => 'required|in:low,medium,high,critical',
            'assigned_to' => 'nullable|exists:users,id',
            'contract_id' => 'nullable|exists:contracts,id',
            'asset_id' => 'nullable|exists:assets,id',
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
}

