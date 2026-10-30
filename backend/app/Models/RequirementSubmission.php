<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequirementSubmission extends Model
{
    protected $fillable = [
        'user_id',
        'intern_id',
        'placement_id',
        'requirement_id',
        'file_path',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    /**
     * `intern_id` is the term-scoped key and the one the unique index is built on;
     * `user_id` is denormalised from it so the existing `whereHas('user.intern', ...)`
     * report queries keep working. Deriving it here removes any chance of the two
     * drifting apart.
     *
     * Supplying only `user_id` falls back to the intern's newest enrollment — the term
     * they are currently in. That is the right guess for a single-term intern, but it is a
     * fallback: anything acting on a specific term must pass `intern_id` explicitly, or a
     * re-enrolled intern's submission will land on the wrong row.
     *
     * `placement_id` follows the same idea for the host dimension: when it is not given
     * it resolves to the intern's open placement, so a submission created directly
     * against an enrollment still lands on the host the intern is actually serving at.
     * A submission tied to a placement implies its intern — the transfer flow keys new
     * rows on the placement alone.
     */
    protected static function booted(): void
    {
        static::saving(function (self $submission): void {
            if (! $submission->intern_id && $submission->placement_id) {
                $submission->intern_id = InternHteAssignment::whereKey($submission->placement_id)->value('intern_id');
            }

            if (! $submission->intern_id && $submission->user_id) {
                $submission->intern_id = Intern::where('user_id', $submission->user_id)
                    ->orderByDesc('academic_year_id')
                    ->value('id');
            }

            if (! $submission->placement_id && $submission->intern_id) {
                $submission->placement_id = InternHteAssignment::query()
                    ->where('intern_id', $submission->intern_id)
                    ->whereNull('unassigned_at')
                    ->latest('id')
                    ->value('id');
            }

            if ($submission->intern_id && ! $submission->user_id) {
                $submission->user_id = Intern::whereKey($submission->intern_id)->value('user_id');
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(Intern::class);
    }

    public function placement(): BelongsTo
    {
        return $this->belongsTo(InternHteAssignment::class, 'placement_id');
    }

    public function requirement(): BelongsTo
    {
        return $this->belongsTo(Requirement::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
