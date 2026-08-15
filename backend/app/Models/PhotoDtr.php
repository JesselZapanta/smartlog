<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhotoDtr extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'intern_id',
        'dtr_date',
        'am_in_time',
        'am_in_photo',
        'am_out_time',
        'am_out_photo',
        'pm_in_time',
        'pm_in_photo',
        'pm_out_time',
        'pm_out_photo',
        'status',
        'verified_by',
        'verified_at',
        'checked_by',
        'checked_at',
        'remarks',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'dtr_date' => 'date',
            'verified_at' => 'datetime',
            'checked_at' => 'datetime',
        ];
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(Intern::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function checker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_by');
    }
}
