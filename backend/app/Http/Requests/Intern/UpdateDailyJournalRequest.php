<?php

namespace App\Http\Requests\Intern;

use App\Models\DailyJournal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateDailyJournalRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'journal' => ['required', 'string'],
            'photos' => ['nullable', 'array', 'max:6'],
            'photos.*' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'remove_photos' => ['nullable', 'array'],
            'remove_photos.*' => ['integer'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator): void {
            /** @var DailyJournal|null $journal */
            $journal = $this->route('journal');

            if (! $journal) {
                return;
            }

            $total = $journal->photos()->count()
                - count($this->input('remove_photos', []))
                + count($this->file('photos', []));

            if ($total > 6) {
                $validator->errors()->add('photos', 'A journal can have at most 6 photos.');
            }
        });
    }
}
