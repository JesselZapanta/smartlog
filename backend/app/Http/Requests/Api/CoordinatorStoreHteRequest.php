<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class CoordinatorStoreHteRequest extends FormRequest
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
            'contact_number' => ['nullable', 'string', 'max:20'],
            'profile_picture' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'confirmed', Password::min(8)],
            'name' => ['required', 'string', 'max:255'],
            'program_id' => ['required', 'integer', 'exists:programs,id'],
            'moa' => ['nullable', 'file', 'mimes:pdf', 'max:10240'],
            'start_at' => ['nullable', 'date'],
            'end_at' => ['nullable', 'date', 'after_or_equal:start_at'],
            'region' => ['nullable', 'string', 'max:255'],
            'province' => ['nullable', 'string', 'max:255'],
            'city_municipality' => ['nullable', 'string', 'max:255'],
            'barangay' => ['nullable', 'string', 'max:255'],
        ];
    }
}
