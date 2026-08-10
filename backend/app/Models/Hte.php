<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Hte extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'institute_id',
        'program_id',
        'moa',
        'start_at',
        'end_at',
        'status',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Hte $hte): void {
            if ($hte->moa) {
                Storage::disk('public')->delete($hte->moa);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'start_at' => 'datetime',
            'end_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function institute(): BelongsTo
    {
        return $this->belongsTo(Institute::class);
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }
}
