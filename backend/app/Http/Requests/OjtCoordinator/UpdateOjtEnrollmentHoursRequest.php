<?php

namespace App\Http\Requests\OjtCoordinator;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateOjtEnrollmentHoursRequest extends FormRequest
{
    /**
     * Institute ownership is checked in the controller, where the application is available.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ojt_hours' => ['required', 'integer', 'min:1', 'max:10000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'ojt_hours.required' => 'Enter the number of OJT hours rendered.',
            'ojt_hours.min' => 'Enter at least 1 hour.',
            'ojt_hours.max' => 'That figure looks too large. Enter the hours rendered.',
        ];
    }
}
