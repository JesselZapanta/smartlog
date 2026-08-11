<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class RejectRegistrationRequest extends FormRequest
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
            'reason' => ['required', 'string', 'min:5', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'A rejection reason is required.',
            'reason.min' => 'The rejection reason must be at least 5 characters.',
        ];
    }
}
