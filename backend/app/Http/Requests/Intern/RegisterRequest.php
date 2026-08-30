<?php

namespace App\Http\Requests\Intern;

use App\Rules\PhMobile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
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
            'firstname' => ['required', 'string', 'max:255'],
            'middlename' => ['nullable', 'string', 'max:255'],
            'lastname' => ['required', 'string', 'max:255'],
            'extension' => ['nullable', 'string', 'max:10'],
            'contact_number' => ['nullable', 'string', 'max:20', new PhMobile],
            'profile_picture' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'confirmed', Password::min(8)],
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
            'cor' => ['required', 'file', 'mimes:pdf', 'max:10240'],
            'region' => ['required', 'string', 'max:255'],
            'province' => ['required', 'string', 'max:255'],
            'city_municipality' => ['required', 'string', 'max:255'],
            'barangay' => ['required', 'string', 'max:255'],
        ];
    }
}
