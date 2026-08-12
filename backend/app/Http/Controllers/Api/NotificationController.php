<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserNotificationResource;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * The authenticated user's notifications, newest first.
     * Meta includes the unread count for the bell badge.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max($request->integer('per_page', 10), 1), 50);

        $rows = $request->user()
            ->userNotifications()
            ->latest()
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => UserNotificationResource::collection($rows),
            'meta' => [
                'current_page' => $rows->currentPage(),
                'last_page' => $rows->lastPage(),
                'per_page' => $rows->perPage(),
                'total' => $rows->total(),
                'from' => $rows->firstItem(),
                'to' => $rows->lastItem(),
                'unread_count' => $request->user()
                    ->userNotifications()
                    ->where('is_read', false)
                    ->count(),
            ],
        ]);
    }

    /**
     * Mark a single notification as read (only the owner may do so).
     */
    public function markRead(Request $request, UserNotification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 404);

        if (! $notification->is_read) {
            $notification->forceFill(['is_read' => true])->save();
        }

        return response()->json([
            'data' => new UserNotificationResource($notification->refresh()),
        ]);
    }

    /**
     * Mark all of the authenticated user's notifications as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $updated = $request->user()
            ->userNotifications()
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'data' => [
                'updated' => $updated,
            ],
        ]);
    }
}
