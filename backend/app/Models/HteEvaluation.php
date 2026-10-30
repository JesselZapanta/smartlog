<?php

namespace App\Models;

use App\Support\EvaluationPlacement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HteEvaluation extends Model
{
    protected $fillable = [
        'intern_id',
        'hte_id',
        'placement_id',
        'criterion_id',
        'rating',
        'is_na',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'is_na' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $evaluation): void {
            $evaluation->placement_id ??= EvaluationPlacement::resolve(
                $evaluation->intern_id,
                $evaluation->hte_id,
            );
        });
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(Intern::class);
    }

    public function placement(): BelongsTo
    {
        return $this->belongsTo(InternHteAssignment::class, 'placement_id');
    }

    public function hte(): BelongsTo
    {
        return $this->belongsTo(Hte::class);
    }

    public function criterion(): BelongsTo
    {
        return $this->belongsTo(EvaluationCriterion::class, 'criterion_id');
    }
}
