<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateHteRequest extends FormRequest
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
            'institute_id' => ['required', 'integer', 'exists:institutes,id'],
            'program_id' => ['required', 'integer', 'exists:programs,id'],
            'moa' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            'start_at' => ['nullable', 'date'],
            'end_at' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::in(['active', 'expired', 'inactive'])],
        ];
    }
}
