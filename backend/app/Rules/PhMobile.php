<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class PhMobile implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $normalized = preg_replace('/[\s\-\(\)]/', '', (string) $value);

        if (! preg_match('/^(\+63|63|0)9\d{9}$/', $normalized)) {
            $fail('The :attribute must be a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).');
        }
    }
}
