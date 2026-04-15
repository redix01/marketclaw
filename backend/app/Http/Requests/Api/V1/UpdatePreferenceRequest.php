<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePreferenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'auto_fill_orders' => ['sometimes', 'boolean'],
            'simulate_slippage' => ['sometimes', 'boolean'],
            'default_max_allocation_percent' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'default_approval_mode' => ['sometimes', 'string', 'in:auto_execute,manual_approval'],
            'notification_preferences' => ['sometimes', 'array'],
            'notification_preferences.email' => ['sometimes', 'boolean'],
            'notification_preferences.push' => ['sometimes', 'boolean'],
        ];
    }
}
