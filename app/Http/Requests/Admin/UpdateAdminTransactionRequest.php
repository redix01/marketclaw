<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAdminTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['sometimes', Rule::in(['deposit', 'withdrawal'])],
            'amount' => ['sometimes', 'numeric', 'gt:0'],
            'description' => ['sometimes', 'string', 'max:255'],
        ];
    }
}
