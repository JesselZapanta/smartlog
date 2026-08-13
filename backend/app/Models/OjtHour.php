<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OjtHour extends Model
{
    protected $fillable = [
        'institute_id',
        'hours',
    ];

    protected function casts(): array
    {
        return [
            'hours' => 'integer',
        ];
    }

    public function institute(): BelongsTo
    {
        return $this->belongsTo(Institute::class);
    }
}
