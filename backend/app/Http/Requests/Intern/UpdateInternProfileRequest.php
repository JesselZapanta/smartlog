<?php

namespace App\Http\Requests\Intern;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInternProfileRequest extends FormRequest
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
            'date_of_birth' => ['required', 'date'],
            'place_of_birth' => ['required', 'string', 'max:255'],
            'fathers_name' => ['required', 'string', 'max:255'],
            'fathers_occupation' => ['required', 'string', 'max:255'],
            'fathers_contact' => ['required', 'string', 'max:255'],
            'mothers_name' => ['required', 'string', 'max:255'],
            'mothers_occupation' => ['required', 'string', 'max:255'],
            'mothers_contact' => ['required', 'string', 'max:255'],
            'parents_guardian_address' => ['required', 'string', 'max:255'],
            'practicum_instructor' => ['required', 'string', 'max:255'],
        ];
    }
}
