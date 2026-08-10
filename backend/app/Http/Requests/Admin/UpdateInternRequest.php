<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInternRequest extends FormRequest
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
            'academic_year_id' => ['required', 'integer', 'exists:academic_terms,id'],
            'institute_id' => ['required', 'integer', 'exists:institutes,id'],
            'program_id' => ['required', 'integer', 'exists:programs,id'],
            'date_of_birth' => ['required', 'date'],
            'place_of_birth' => ['nullable', 'string', 'max:255'],
            'fathers_name' => ['nullable', 'string', 'max:255'],
            'fathers_occupation' => ['nullable', 'string', 'max:255'],
            'fathers_contact' => ['nullable', 'string', 'max:255'],
            'mothers_name' => ['nullable', 'string', 'max:255'],
            'mothers_occupation' => ['nullable', 'string', 'max:255'],
            'mothers_contact' => ['nullable', 'string', 'max:255'],
            'parents_guardian_address' => ['nullable', 'string', 'max:255'],
            'practicum_instructor' => ['nullable', 'string', 'max:255'],
        ];
    }
}
