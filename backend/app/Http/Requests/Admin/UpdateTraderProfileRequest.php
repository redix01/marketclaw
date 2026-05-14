<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTraderProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'string'],
            'commission_percent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'level' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
