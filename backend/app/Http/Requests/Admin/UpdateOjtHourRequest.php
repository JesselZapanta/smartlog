<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOjtHourRequest extends FormRequest
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
            'institute_id' => [
                'required',
                'integer',
                'exists:institutes,id',
                Rule::unique('ojt_hours', 'institute_id')->ignore($this->route('ojt_hour')),
            ],
            'hours' => ['required', 'integer', 'min:1', 'max:10000'],
        ];
    }
}
