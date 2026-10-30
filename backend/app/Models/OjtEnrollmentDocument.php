<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A document that must be attached to a re-enrolment application.
 *
 * OJT hours used to sit here as a third "document", which was wrong — hours are a
 * number declared on the application (see OjtEnrollment::$ojt_hours), not a file.
 * `other` is an optional extra slot, kept because the upload form previously accepted
 * any free-text label; legacy rows are mapped to it on migration.
 */
class OjtEnrollmentDocument extends Model
{
    public const REQUIRED_TYPES = ['cor', 'curriculum'];

    public const TYPES = ['cor', 'curriculum', 'other'];

    protected $fillable = [
        'ojt_enrollment_id',
        'label',
        'type',
        'file_path',
    ];

    protected function casts(): array
    {
        return [
            'type' => 'string',
        ];
    }

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(OjtEnrollment::class, 'ojt_enrollment_id');
    }
}
