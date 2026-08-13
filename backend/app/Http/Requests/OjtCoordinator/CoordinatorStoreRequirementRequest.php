<?php

namespace App\Http\Requests\OjtCoordinator;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CoordinatorStoreRequirementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', Rule::in(['pre_deployment', 'post_deployment'])],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
