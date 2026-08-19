<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\PhotoDtrResource;
use App\Models\PhotoDtr;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Intervention\Image\ImageManager;

class PhotoDtrController extends Controller
{
    private const SLOTS = ['am_in', 'am_out', 'pm_in', 'pm_out'];

    /**
     * The intern's photo DTR history (latest 60) plus today's record.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $intern = $user->intern;

        if (! $intern || $intern->status !== 'approved') {
            return response()->json([
                'data' => [],
                'today' => null,
                'deployed' => false,
            ]);
        }

        $records = PhotoDtr::with(['verifier', 'checker'])
            ->where('intern_id', $intern->id);

        $from = $request->string('from')->trim()->toString();
        $to = $request->string('to')->trim()->toString();

        if ($from !== '') {
            $records->whereDate('dtr_date', '>=', $from);
        }

        if ($to !== '') {
            $records->whereDate('dtr_date', '<=', $to);
        }

        $records = $records->orderByDesc('dtr_date')->limit(60)->get();

        $today = $records->first(fn (PhotoDtr $record): bool => $record->dtr_date->isToday());

        return response()->json([
            'data' => PhotoDtrResource::collection($records),
            'today' => $today ? new PhotoDtrResource($today) : null,
            'deployed' => $intern->ojt_status === 'ongoing',
            'ojt_status' => $intern->ojt_status,
        ]);
    }

    /**
     * Punch a slot (am_in / am_out / pm_in / pm_out) with a photo for today.
     */
    public function punch(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $intern = $user->intern;

        if (! $intern || $intern->status !== 'approved') {
            abort(403, 'Your registration must be approved before recording your DTR.');
        }

        if ($intern->ojt_status !== 'ongoing') {
            abort(403, 'You must be deployed before recording your DTR.');
        }

        $data = $request->validate([
            'slot' => ['required', 'string', 'in:'.implode(',', self::SLOTS)],
            'photo' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        $isAmSlot = in_array($data['slot'], ['am_in', 'am_out'], true);
        $isAmPeriod = (int) now()->format('G') < 12;

        if ($data['slot'] === 'am_in' && ! $isAmPeriod) {
            throw ValidationException::withMessages([
                'slot' => ['AM In can only be clocked before 12:00 PM.'],
            ]);
        }

        if ($data['slot'] === 'am_out' && (int) now()->format('G') >= 13) {
            throw ValidationException::withMessages([
                'slot' => ['AM Out can only be clocked before 1:00 PM (grace period).'],
            ]);
        }

        if (! $isAmSlot && $isAmPeriod) {
            throw ValidationException::withMessages([
                'slot' => ['PM slots can only be clocked at or after 12:00 PM.'],
            ]);
        }

        $record = PhotoDtr::firstOrCreate(
            ['intern_id' => $intern->id, 'dtr_date' => now()->startOfDay()],
            ['status' => 'pending'],
        );

        $timeColumn = $data['slot'].'_time';
        $photoColumn = $data['slot'].'_photo';

        if ($record->$photoColumn) {
            Storage::disk('public')->delete($record->$photoColumn);
        }

        $photoPath = 'photo-dtr/'.Str::uuid().'.webp';

        $encoded = ImageManager::gd()
            ->read($request->file('photo'))
            ->orient()
            ->scaleDown(1080, 1080)
            ->toWebp(80);

        Storage::disk('public')->put($photoPath, $encoded->toString());

        $record->forceFill([
            $timeColumn => now()->format('H:i:s'),
            $photoColumn => $photoPath,
            'status' => 'pending',
        ])->save();

        return response()->json([
            'data' => new PhotoDtrResource($record->fresh()->load(['verifier', 'checker'])),
        ]);
    }
}
