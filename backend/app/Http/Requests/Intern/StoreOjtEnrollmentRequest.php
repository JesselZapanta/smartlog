<?php

namespace App\Http\Requests\Intern;

use Illuminate\Foundation\Http\FormRequest;

class StoreOjtEnrollmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Only the target term is always required. The institute and program are copied
     * from the intern's existing enrollment on the server, so a re-enrollment
     * cannot switch programme by tampering with the request body.
     *
     * Uploads and hours are optional here because a rejected application can be
     * corrected and resubmitted without re-sending every unchanged file. New
     * applications supply them in the same request instead of using a draft row.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'academic_year_id' => ['required', 'integer', 'exists:academic_terms,id'],
            'ojt_hours' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'cor' => ['sometimes', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'curriculum' => ['sometimes', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'academic_year_id.required' => 'Choose the term you want to enrol for.',
            'academic_year_id.exists' => 'That academic term does not exist.',
            'ojt_hours.min' => 'Enter at least 1 hour.',
            'ojt_hours.max' => 'That figure looks too large. Enter the hours you have rendered.',
            'cor.mimes' => 'The New COR must be a PDF, JPG, PNG or JPEG file.',
            'curriculum.mimes' => 'The curriculum must be a PDF, JPG, PNG or JPEG file.',
        ];
    }
}
