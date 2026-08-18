<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
use App\Http\Requests\Intern\StoreDailyJournalRequest;
use App\Http\Requests\Intern\UpdateDailyJournalRequest;
use App\Http\Resources\Intern\DailyJournalResource;
use App\Models\DailyJournal;
use App\Models\JournalPhoto;
use App\Models\PhotoDtr;
use App\Models\User;
use App\Services\ImageOptimizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class DailyJournalController extends Controller
{
    /**
     * The intern's journal entries for a month (or a single day when `date` is given).
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $intern = $user->intern;

        if (! $intern || $intern->status !== 'approved') {
            return response()->json([
                'data' => [],
                'deployed' => false,
            ]);
        }

        $deployed = $intern->ojt_status === 'ongoing';

        $payload = [
            'deployed' => $deployed,
            'start_date' => $intern->start_date?->toDateString(),
        ];

        $date = $request->string('date')->trim()->toString();

        if ($date !== '') {
            $journal = DailyJournal::with('photos')
                ->where('intern_id', $intern->id)
                ->whereDate('date', $date)
                ->first();

            return response()->json([
                ...$payload,
                'data' => $journal ? new DailyJournalResource($journal) : null,
            ]);
        }

        $query = DailyJournal::with('photos')->where('intern_id', $intern->id);

        $month = $request->string('month')->trim()->toString();

        if (preg_match('/^\d{4}-\d{2}$/', $month)) {
            [$year, $monthNumber] = explode('-', $month);
            $query->whereYear('date', (int) $year)->whereMonth('date', (int) $monthNumber);
        }

        return response()->json([
            ...$payload,
            'data' => DailyJournalResource::collection($query->orderByDesc('date')->get()),
        ]);
    }

    /**
     * Create a daily journal entry (with optional photos) for the intern.
     */
    public function store(StoreDailyJournalRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->authorizeIntern($request, 'writing your daily journal.');

        $hasDtr = PhotoDtr::where('intern_id', $user->intern->id)
            ->whereDate('dtr_date', $request->input('date'))
            ->exists();

        if (! $hasDtr) {
            throw ValidationException::withMessages([
                'date' => ['A photo DTR record is required for this date before writing a journal.'],
            ]);
        }

        $exists = DailyJournal::where('intern_id', $user->intern->id)
            ->whereDate('date', $request->input('date'))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'date' => ['A journal entry already exists for this date.'],
            ]);
        }

        $journal = DailyJournal::create([
            'intern_id' => $user->intern->id,
            'date' => $request->input('date'),
            'title' => $request->input('title'),
            'journal' => $request->input('journal'),
            'status' => 'pending',
        ]);

        $this->storePhotos($journal, $request->file('photos', []));

        return response()->json([
            'data' => new DailyJournalResource($journal->fresh()->load('photos')),
        ], 201);
    }

    /**
     * Show one of the intern's journal entries.
     */
    public function show(Request $request, DailyJournal $journal): JsonResponse
    {
        $this->authorizeJournal($request, $journal);

        return response()->json([
            'data' => new DailyJournalResource($journal->load('photos')),
        ]);
    }

    /**
     * Update the journal entry, append new photos and/or remove existing ones.
     * Editing resets the status to pending so supervisors can re-review it.
     */
    public function update(UpdateDailyJournalRequest $request, DailyJournal $journal): JsonResponse
    {
        $this->authorizeJournal($request, $journal);
        $this->authorizeIntern($request, 'editing your daily journal.');

        $journal->forceFill([
            'title' => $request->input('title'),
            'journal' => $request->input('journal'),
            'status' => 'pending',
        ])->save();

        $this->storePhotos($journal, $request->file('photos', []));

        $removeIds = collect($request->input('remove_photos', []))
            ->map(fn (mixed $id): int => (int) $id)
            ->all();

        if ($removeIds !== []) {
            $photos = JournalPhoto::where('journal_id', $journal->id)->whereIn('id', $removeIds)->get();

            foreach ($photos as $photo) {
                Storage::disk('public')->delete($photo->photo);
                $photo->delete();
            }
        }

        return response()->json([
            'data' => new DailyJournalResource($journal->fresh()->load('photos')),
        ]);
    }

    /**
     * Delete one of the intern's journal entries (and its photos).
     */
    public function destroy(Request $request, DailyJournal $journal): JsonResponse
    {
        $this->authorizeJournal($request, $journal);

        foreach ($journal->photos as $photo) {
            Storage::disk('public')->delete($photo->photo);
        }

        $journal->delete();

        return response()->json([
            'data' => ['message' => 'Journal deleted successfully.'],
        ]);
    }

    /**
     * Ensure the journal belongs to the authenticated intern.
     */
    private function authorizeJournal(Request $request, DailyJournal $journal): void
    {
        $intern = $request->user()->intern;

        if (! $intern || $journal->intern_id !== $intern->id) {
            abort(403, 'You can only manage your own journal entries.');
        }
    }

    /**
     * Ensure the intern is approved and deployed.
     */
    private function authorizeIntern(Request $request, string $action): void
    {
        $intern = $request->user()->intern;

        if (! $intern) {
            abort(403, 'Your account is not linked to an intern profile.');
        }

        if ($intern->status !== 'approved') {
            abort(403, 'Your registration must be approved before '.$action);
        }

        if ($intern->ojt_status !== 'ongoing') {
            abort(403, 'You must be deployed before '.$action);
        }
    }

    /**
     * @param  array<int, UploadedFile>  $files
     */
    private function storePhotos(DailyJournal $journal, array $files): void
    {
        foreach ($files as $file) {
            $journal->photos()->create([
                'photo' => ImageOptimizer::storeJournalPhoto($file),
            ]);
        }
    }
}
