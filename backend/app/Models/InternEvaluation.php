<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InternEvaluation extends Model
{
    protected $fillable = [
        'intern_id',
        'hte_id',
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

    public function intern(): BelongsTo
    {
        return $this->belongsTo(Intern::class);
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
