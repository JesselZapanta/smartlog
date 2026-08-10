<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCoordinatorRequest extends FormRequest
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
            'program_id' => ['required', 'integer', 'exists:programs,id'],
        ];
    }
}
