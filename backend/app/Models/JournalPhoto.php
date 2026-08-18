<?php

namespace App\Models;

use Database\Factories\JournalPhotoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalPhoto extends Model
{
    /** @use HasFactory<JournalPhotoFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'journal_id',
        'photo',
    ];

    public function journal(): BelongsTo
    {
        return $this->belongsTo(DailyJournal::class, 'journal_id');
    }
}
