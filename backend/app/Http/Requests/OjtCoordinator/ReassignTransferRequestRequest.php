<?php

namespace App\Http\Requests\OjtCoordinator;

use Illuminate\Foundation\Http\FormRequest;

class ReassignTransferRequestRequest extends FormRequest
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
            'to_hte_id' => ['required', 'integer', 'exists:htes,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'to_hte_id.required' => 'Select the new HTE to reassign this intern to.',
        ];
    }
}
