<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EvaluationCriterion extends Model
{
    protected $fillable = [
        'institute_id',
        'category',
        'indicator',
        'type',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'string',
        ];
    }

    public function internEvaluations(): HasMany
    {
        return $this->hasMany(InternEvaluation::class, 'criterion_id');
    }

    public function hteEvaluations(): HasMany
    {
        return $this->hasMany(HteEvaluation::class, 'criterion_id');
    }
}
