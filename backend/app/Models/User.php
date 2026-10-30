<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'firstname',
        'middlename',
        'lastname',
        'extension',
        'contact_number',
        'profile_picture',
        'role',
        'email',
        'email_verified_at',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'email_otp',
        'password_reset_otp',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'email_otp_expires_at' => 'datetime',
            'password_reset_otp_expires_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function location(): HasOne
    {
        return $this->hasOne(Location::class);
    }

    public function intern(): HasOne
    {
        return $this->hasOne(Intern::class);
    }

    /**
     * Every OJT enrollment this user holds, oldest term first.
     *
     * Added alongside — not instead of — `intern()`. `intern()` stays a HasOne
     * on purpose: it is read in 113 places and flipping it to a HasMany would
     * silently resolve to an arbitrary term. Migrating those call sites to an
     * explicit term is a separate, deliberate change.
     */
    public function internEnrollments(): HasMany
    {
        return $this->hasMany(Intern::class)->orderBy('academic_year_id');
    }

    /**
     * The enrollment for the newest term, used where a single "current" record
     * is needed but the user may now hold several.
     */
    public function activeEnrollment(): ?Intern
    {
        // A fresh relation, not internEnrollments(): that one already carries an
        // ASC order, and appending a DESC would be ignored, returning the oldest term.
        return $this->hasMany(Intern::class)->orderByDesc('academic_year_id')->first();
    }

    /**
     * The enrollment for a specific term, or the active one when no term is given.
     *
     * Used by screens that can look at one intern across several terms, so a
     * caller can pin the term instead of always landing on the newest.
     */
    public function enrollmentFor(?int $academicYearId = null): ?Intern
    {
        if (! $academicYearId) {
            return $this->activeEnrollment();
        }

        return $this->hasMany(Intern::class)->where('academic_year_id', $academicYearId)->first();
    }

    /**
     * The original registration row — the earliest term this user enrolled for.
     *
     * Registration status belongs to the first enrollment; later enrollments are
     * created already approved and must not overwrite it.
     */
    public function originalEnrollment(): ?Intern
    {
        // reorder() rather than orderBy(): the relation already carries an
        // orderBy('academic_year_id'), and appending a second one is ignored.
        return $this->internEnrollments()->reorder('academic_year_id', 'asc')->first();
    }

    /**
     * The term whose OJT grade was recorded as Passed, if any.
     *
     * Passing is terminal for this programme: once a term is graded Passed the
     * intern has completed their OJT and may not enrol again. A Failed (or still
     * ungraded) term leaves them free to enrol in a later term.
     */
    public function passedEnrollment(): ?Intern
    {
        // reorder() is required here. The relation orders by academic_year_id ASC,
        // so appending orderByDesc produced "ASC, DESC" and ASC won — this would
        // silently return the oldest passed term instead of the newest.
        return $this->internEnrollments()
            ->where('grade', 'Passed')
            ->reorder('academic_year_id', 'desc')
            ->first();
    }

    public function hasPassedOjt(): bool
    {
        return $this->passedEnrollment() !== null;
    }

    public function hte(): HasOne
    {
        return $this->hasOne(Hte::class);
    }

    public function coordinator(): HasOne
    {
        return $this->hasOne(Coordinator::class);
    }

    public function userNotifications(): HasMany
    {
        return $this->hasMany(UserNotification::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function getJWTCustomClaims(): array
    {
        return [
            'uuid' => $this->uuid,
            'role' => $this->role,
        ];
    }

    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn () => trim(implode(' ', array_filter([
                $this->firstname,
                $this->middlename,
                $this->lastname,
                $this->extension,
            ]))),
        );
    }
}
