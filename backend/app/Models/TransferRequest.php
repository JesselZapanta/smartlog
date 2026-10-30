<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * A host-transfer request for one intern within one term.
 *
 * Lifecycle: `requested` (OJT instructor) → `accepted` (outgoing HTE accepts and
 * evaluates the intern) → `evaluated` (the intern has also evaluated that HTE;
 * either side completing second flips this) → `reassigned` (coordinator picked
 * the new HTE). There is no cancel and no rejection: the outgoing HTE can only
 * accept, and the flow ends with the coordinator reassigning.
 */
class TransferRequest extends Model
{
    public const STATUS_REQUESTED = 'requested';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_EVALUATED = 'evaluated';

    public const STATUS_REASSIGNED = 'reassigned';

    protected $fillable = [
        'uuid',
        'intern_id',
        'academic_year_id',
        'from_hte_id',
        'to_hte_id',
        'from_placement_id',
        'to_placement_id',
        'requested_by',
        'reason',
        'status',
        'accepted_at',
        'evaluated_at',
        'reassigned_at',
        'reassigned_by',
    ];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
            'evaluated_at' => 'datetime',
            'reassigned_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $transferRequest): void {
            $transferRequest->uuid ??= (string) Str::uuid();
        });
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(Intern::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class, 'academic_year_id');
    }

    public function fromHte(): BelongsTo
    {
        return $this->belongsTo(Hte::class, 'from_hte_id');
    }

    public function toHte(): BelongsTo
    {
        return $this->belongsTo(Hte::class, 'to_hte_id');
    }

    public function fromPlacement(): BelongsTo
    {
        return $this->belongsTo(InternHteAssignment::class, 'from_placement_id');
    }

    public function toPlacement(): BelongsTo
    {
        return $this->belongsTo(InternHteAssignment::class, 'to_placement_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reassigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reassigned_by');
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', '!=', self::STATUS_REASSIGNED);
    }
}
