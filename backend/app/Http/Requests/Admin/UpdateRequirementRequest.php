<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRequirementRequest extends FormRequest
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
            'institute_id' => ['required', 'integer', 'exists:institutes,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('requirements', 'name')
                    ->where(fn ($query) => $query->where('institute_id', $this->input('institute_id')))
                    ->ignore($this->route('requirement')),
            ],
            'description' => ['nullable', 'string'],
            'type' => ['required', Rule::in(['pre_deployment', 'post_deployment'])],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
