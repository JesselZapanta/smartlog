<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'assigned_hte',
        'ojt_status',
        'start_date',
        'end_date',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function journals(): HasMany
    {
        return $this->hasMany(DailyJournal::class);
    }

    public function photoDtrs(): HasMany
    {
        return $this->hasMany(PhotoDtr::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function assignedHte(): BelongsTo
    {
        return $this->belongsTo(Hte::class, 'assigned_hte');
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

    public function requiredHours(): ?int
    {
        return $this->institute?->ojtHour?->hours;
    }

    public function earnedMinutes(): int
    {
        return $this->photoDtrs
            ->where('status', 'checked')
            ->reduce(fn (int $sum, PhotoDtr $dtr): int => $sum + $dtr->computedMinutes(), 0);
    }
}
