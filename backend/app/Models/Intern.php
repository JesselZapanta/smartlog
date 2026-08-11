<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Intern extends Model
{
    protected $fillable = [
        'user_id',
        'academic_year_id',
        'institute_id',
        'program_id',
        'date_of_birth',
        'place_of_birth',
        'fathers_name',
        'fathers_occupation',
        'fathers_contact',
        'mothers_name',
        'mothers_occupation',
        'mothers_contact',
        'parents_guardian_address',
        'practicum_instructor',
        'cor_path',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class, 'academic_year_id');
    }

    public function institute(): BelongsTo
    {
        return $this->belongsTo(Institute::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }
}
