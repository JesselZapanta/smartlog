<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;

/**
 * One intern–HTE placement. Open while `unassigned_at` is null.
 *
 * Requirement submissions and evaluations attach to a placement, so work done
 * at a previous host stays attributable to that host after a transfer, and the
 * intern starts a fresh cycle at the new one.
 */
class InternHteAssignment extends Model
{
    protected $fillable = [
        'intern_id',
        'hte_id',
        'academic_year_id',
        'transfer_request_id',
        'assigned_at',
        'assigned_by',
        'unassigned_at',
        'unassigned_by',
        'deployed_at',
        'requirements_customized_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'unassigned_at' => 'datetime',
            'deployed_at' => 'datetime',
            'requirements_customized_at' => 'datetime',
        ];
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(Intern::class);
    }

    public function hte(): BelongsTo
    {
        return $this->belongsTo(Hte::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicTerm::class, 'academic_year_id');
    }

    public function transferRequest(): BelongsTo
    {
        return $this->belongsTo(TransferRequest::class);
    }

    public function requirements(): BelongsToMany
    {
        return $this->belongsToMany(Requirement::class, 'placement_requirements')
            ->withTimestamps();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('unassigned_at');
    }

    public function isActive(): bool
    {
        return $this->unassigned_at === null;
    }

    /**
     * The requirements this placement expects, optionally narrowed to one type.
     *
     * Until the coordinator customises the set (during reassignment) the
     * placement follows the institute's active list, so a requirement added
     * after the interns were assigned still shows up — the normal flow. Once
     * `requirements_customized_at` is set, the pivot is authoritative.
     *
     * @return Collection<int, Requirement>
     */
    public function requirementList(?string $type = null): Collection
    {
        if ($this->requirements_customized_at !== null) {
            return $this->requirements()
                ->where('requirements.is_active', true)
                ->when($type !== null, fn (Builder $query) => $query->where('requirements.type', $type))
                ->orderBy('requirements.id')
                ->get();
        }

        return Requirement::where('institute_id', $this->intern->institute_id)
            ->where('is_active', true)
            ->when($type !== null, fn (Builder $query) => $query->where('type', $type))
            ->orderBy('id')
            ->get();
    }
}
