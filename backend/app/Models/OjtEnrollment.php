<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OjtEnrollment extends Model
{
    protected $fillable = [
        'user_id',
        'academic_year_id',
        'institute_id',
        'program_id',
        'ojt_hours',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'ojt_hours' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * Everything that must be provided before this application can be submitted.
     *
     * Two attached documents plus a declared hours figure. Modelled as one flat list
     * so the page can render a single checklist, mirroring the requirements module.
     *
     * @var array<string, string>
     */
    public const REQUIRED_ITEMS = [
        'cor' => 'New COR',
        'curriculum' => 'Curriculum',
        'ojt_hours' => 'OJT hours',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
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

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(OjtEnrollmentDocument::class);
    }

    /**
     * Which required items are still missing from this application.
     *
     * Uses the loaded relation when present so the resource does not trigger a query
     * per document. Hours count as supplied only once a positive figure is declared.
     *
     * @return array<int, string>
     */
    public function missingRequiredItems(): array
    {
        $uploaded = $this->relationLoaded('documents')
            ? $this->documents->pluck('type')->all()
            : $this->documents()->pluck('type')->all();

        $missing = array_values(array_diff(OjtEnrollmentDocument::REQUIRED_TYPES, $uploaded));

        if (! $this->hasOjtHours()) {
            $missing[] = 'ojt_hours';
        }

        return $missing;
    }

    /**
     * A declared hours figure. Zero is treated as not supplied so an untouched or
     * cleared field cannot unlock enrollment.
     */
    public function hasOjtHours(): bool
    {
        return (int) $this->ojt_hours > 0;
    }

    /**
     * Whether the intern may still change this application.
     *
     * One application is permitted per term. A rejected application may be corrected
     * and resubmitted. A submitted or approved application is read-only for the intern.
     */
    public function isEditable(): bool
    {
        return $this->status === 'rejected';
    }

    /**
     * The intern's most recent existing enrollment row, which supplies the
     * institute and program a re-enrollment must keep.
     */
    public function previousIntern(): ?Intern
    {
        return Intern::where('user_id', $this->user_id)
            ->orderByDesc('academic_year_id')
            ->first();
    }
}
