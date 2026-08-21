<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Issue extends Model
{
    protected $fillable = [
        'intern_id',
        'hte_id',
        'type',
        'issues',
        'solutions',
        'recommendations',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'type' => 'string',
            'status' => 'string',
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
}
