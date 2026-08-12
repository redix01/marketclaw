<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreTraderUpgradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'asset_type' => ['required', 'string', 'in:stock,crypto'],
            'requested_level' => ['required', 'integer', 'min:2', 'max:100'],
            'note' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
