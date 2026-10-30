<?php

namespace App\Models;

use App\Support\InternPlacements;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

class Intern extends Model
{
    /**
     * Term enrollment applications warmed by `prefetchTermEnrollments()`, keyed by
     * "user_id:academic_year_id". Request-scoped in practice; `null` records a term the
     * intern never applied for, so a miss does not trigger a fresh query per row.
     *
     * @var array<string, OjtEnrollment|null>
     */
    protected static array $termEnrollmentCache = [];

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
        'assigned_hte',
        'ojt_status',
        'grade',
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

    protected static function booted(): void
    {
        // `wasChanged()` is empty on insert — change tracking only fills in on
        // update — so creation needs its own check.
        static::created(function (Intern $intern): void {
            if ($intern->assigned_hte !== null) {
                InternPlacements::sync($intern);
            }
        });

        static::updated(function (Intern $intern): void {
            if ($intern->wasChanged('assigned_hte')) {
                InternPlacements::sync($intern);
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function hteAssignments(): HasMany
    {
        return $this->hasMany(InternHteAssignment::class);
    }

    public function transferRequests(): HasMany
    {
        return $this->hasMany(TransferRequest::class);
    }

    /**
     * The HTE the intern is currently placed at, or null while unassigned or
     * between a transfer and the coordinator's redeployment.
     */
    public function activePlacement(): ?InternHteAssignment
    {
        return $this->hteAssignments()->active()->latest('id')->first();
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

    public function evaluations(): HasMany
    {
        return $this->hasMany(InternEvaluation::class);
    }

    public function hteEvaluations(): HasMany
    {
        return $this->hasMany(HteEvaluation::class);
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

    /**
     * The OJT hours this intern must render for this term.
     *
     * The enrollment application is the single source. Curricula differ, so the figure
     * is declared by the intern on the application for the exact term they are serving,
     * rather than being an institute-wide constant.
     *
     * Null means there is no OJT enrollment application for this term — the intern has
     * registered but has not applied yet. Callers must treat that as "no requirement
     * declared", not as zero: progress and the HTE completion gate both need to say the
     * intern must apply before either figure means anything.
     */
    public function requiredHours(): ?int
    {
        $declaredHours = $this->ojtEnrollmentForTerm()?->ojt_hours;

        return (int) $declaredHours > 0 ? (int) $declaredHours : null;
    }

    /**
     * The enrollment application for this term, if the intern ever submitted one.
     *
     * Matched on user plus academic year rather than through a foreign key, because
     * `ojt_enrollments` is keyed on the person and the term — one application per
     * intern per term — and that is exactly the grain `requiredHours()` needs. Callers
     * rendering a list should prefetch with `Intern::withTermEnrollments()` instead of
     * letting this run per row.
     */
    public function ojtEnrollmentForTerm(): ?OjtEnrollment
    {
        $key = $this->user_id.':'.$this->academic_year_id;

        // Served from the prefetch when a list caller has already warmed it.
        if (array_key_exists($key, self::$termEnrollmentCache)) {
            return self::$termEnrollmentCache[$key];
        }

        return OjtEnrollment::where('user_id', $this->user_id)
            ->where('academic_year_id', $this->academic_year_id)
            ->first();
    }

    /**
     * Term applications for a page of enrollment rows, keyed by "user_id:academic_year_id".
     *
     * `requiredHours()` is called once per row by the list endpoints, so without this
     * each page would issue one extra query per intern. Callers that render rows should
     * invoke this before serialising; results are cached on the model and reused by
     * `ojtEnrollmentForTerm()`.
     *
     * @param  Collection<int, Intern>  $interns
     */
    public static function prefetchTermEnrollments($interns): void
    {
        $interns = collect($interns)->filter(
            fn (Intern $intern): bool => $intern->user_id !== null && $intern->academic_year_id !== null
        );

        if ($interns->isEmpty()) {
            return;
        }

        $applications = OjtEnrollment::whereIn('user_id', $interns->pluck('user_id')->unique())
            ->whereIn('academic_year_id', $interns->pluck('academic_year_id')->unique())
            ->get();

        foreach ($applications as $application) {
            self::$termEnrollmentCache[$application->user_id.':'.$application->academic_year_id] = $application;
        }

        // Mark the misses too, so a row with no application does not fall through to a
        // per-row query.
        foreach ($interns as $intern) {
            self::$termEnrollmentCache[$intern->user_id.':'.$intern->academic_year_id] ??= null;
        }
    }

    public static function flushTermEnrollmentCache(): void
    {
        self::$termEnrollmentCache = [];
    }

    public function earnedMinutes(): int
    {
        return $this->photoDtrs
            ->where('status', 'checked')
            ->reduce(fn (int $sum, PhotoDtr $dtr): int => $sum + $dtr->computedMinutes(), 0);
    }
}
