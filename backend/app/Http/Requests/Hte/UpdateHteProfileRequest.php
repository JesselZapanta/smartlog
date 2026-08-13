<?php

namespace App\Http\Requests\Hte;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHteProfileRequest extends FormRequest
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
            'start_at' => ['nullable', 'date'],
            'end_at' => ['nullable', 'date'],
        ];
    }
}
