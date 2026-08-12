<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SubmitOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'symbol_id' => ['required', 'integer', 'exists:symbols,id'],
            'side' => ['required', 'string', 'in:buy,sell'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'submitted_price' => ['nullable', 'numeric', 'gt:0'],
            'source' => ['nullable', 'string', 'in:manual,bot,admin'],
            'agent_id' => ['nullable', 'integer'],
        ];
    }
}
