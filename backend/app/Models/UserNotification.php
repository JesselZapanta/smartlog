<?php

namespace App\Models;

use App\Events\NotificationPushed;
use App\Http\Resources\UserNotificationResource;
use Database\Factories\UserNotificationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotification extends Model
{
    /** @use HasFactory<UserNotificationFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'is_read',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'is_read' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Create an unread notification for a user.
     *
     * @param  array<string, mixed>  $data
     */
    public static function notify(User $user, string $type, string $title, string $message, array $data = []): self
    {
        $notification = self::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'is_read' => false,
        ]);

        NotificationPushed::dispatch(
            $user->uuid,
            (new UserNotificationResource($notification))->resolve(),
            $user->userNotifications()->where('is_read', false)->count(),
        );

        return $notification;
    }

    /**
     * Notify every OJT instructor.
     *
     * @param  array<string, mixed>  $data
     */
    public static function notifyInstructors(string $type, string $title, string $message, array $data = []): int
    {
        $instructors = User::where('role', 'ojt_instructor')->get();

        foreach ($instructors as $instructor) {
            self::notify($instructor, $type, $title, $message, $data);
        }

        return $instructors->count();
    }

    /**
     * Notify every OJT coordinator assigned to the given institute.
     *
     * @param  array<string, mixed>  $data
     */
    public static function notifyCoordinators(int $instituteId, string $type, string $title, string $message, array $data = []): int
    {
        $coordinators = User::where('role', 'ojt_coordinator')
            ->whereHas('coordinator', fn ($query) => $query->where('institute_id', $instituteId))
            ->get();

        foreach ($coordinators as $coordinator) {
            self::notify($coordinator, $type, $title, $message, $data);
        }

        return $coordinators->count();
    }

    /**
     * Notify every admin (OPAO).
     *
     * @param  array<string, mixed>  $data
     */
    public static function notifyAdmins(string $type, string $title, string $message, array $data = []): int
    {
        $admins = User::where('role', 'admin')->get();

        foreach ($admins as $admin) {
            self::notify($admin, $type, $title, $message, $data);
        }

        return $admins->count();
    }
}
