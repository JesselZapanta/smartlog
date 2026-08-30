<?php

namespace App\Http\Requests\Admin;

use App\Rules\PhMobile;
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
            'place_of_birth' => ['required', 'string', 'max:255'],
            'fathers_name' => ['required', 'string', 'max:255'],
            'fathers_occupation' => ['required', 'string', 'max:255'],
            'fathers_contact' => ['required', 'string', 'max:255', new PhMobile],
            'mothers_name' => ['required', 'string', 'max:255'],
            'mothers_occupation' => ['required', 'string', 'max:255'],
            'mothers_contact' => ['required', 'string', 'max:255', new PhMobile],
            'parents_guardian_address' => ['required', 'string', 'max:255'],
            'practicum_instructor' => ['required', 'string', 'max:255'],
            'cor' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
        ];
    }
}
