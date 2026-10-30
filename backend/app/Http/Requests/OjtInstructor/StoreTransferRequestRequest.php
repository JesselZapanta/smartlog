<?php

namespace App\Http\Requests\OjtInstructor;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransferRequestRequest extends FormRequest
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
            'intern_uuid' => ['required', 'string', 'exists:users,uuid'],
            'reason' => ['required', 'string', 'min:5', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'intern_uuid.required' => 'Select the intern to transfer.',
            'reason.required' => 'A reason for the transfer is required.',
            'reason.min' => 'The reason must be at least 5 characters.',
        ];
    }
}
