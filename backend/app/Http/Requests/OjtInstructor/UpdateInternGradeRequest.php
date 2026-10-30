<?php

namespace App\Http\Requests\OjtInstructor;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInternGradeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Grade is advisory, so the API accepts Passed even when the hour
     * requirement is unmet — the instructor sees a warning in the UI and can
     * proceed. Grade is intentionally independent of `ojt_status`.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'grade' => ['present', 'nullable', Rule::in(['Passed', 'Failed'])],
            // Optional. Lets the grade list target a specific term row instead of
            // always writing to the intern's newest enrollment.
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_terms,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'grade.in' => 'Grade must be Passed or Failed.',
        ];
    }
}
