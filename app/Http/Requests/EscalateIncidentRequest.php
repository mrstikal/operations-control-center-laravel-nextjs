<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EscalateIncidentRequest extends FormRequest
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
            'escalated_to' => 'required|exists:users,id',
            'escalation_level' => 'required|in:level_1,level_2,level_3,level_4',
            'reason' => 'required|string',
            'notes' => 'nullable|string',
        ];
    }
}
