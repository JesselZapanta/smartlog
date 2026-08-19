<?php

namespace App\Http\Controllers\Api\OjtInstructor;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\DailyJournalResource;
use App\Http\Resources\Intern\PhotoDtrResource;
use App\Models\DailyJournal;
use App\Models\Intern;
use App\Models\PhotoDtr;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternMonitoringController extends Controller
{
    /**
     * A deployed intern's journals and photo DTR records, scoped to a month
     * (or a single date when `date` is given).
     */
    public function index(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($user);

        $date = $request->string('date')->trim()->toString();

        if ($date !== '') {
            $journal = DailyJournal::with('photos')
                ->where('intern_id', $intern->id)
                ->whereDate('date', $date)
                ->first();

            $dtr = PhotoDtr::with(['verifier', 'checker'])
                ->where('intern_id', $intern->id)
                ->whereDate('dtr_date', $date)
                ->first();

            return response()->json([
                'data' => $journal ? new DailyJournalResource($journal) : null,
                'dtr' => $dtr ? new PhotoDtrResource($dtr) : null,
            ]);
        }

        $journals = DailyJournal::with('photos')->where('intern_id', $intern->id);

        $dtrs = PhotoDtr::with(['verifier', 'checker'])->where('intern_id', $intern->id);

        $month = $request->string('month')->trim()->toString();

        if (preg_match('/^\d{4}-\d{2}$/', $month)) {
            [$year, $monthNumber] = explode('-', $month);
            $journals->whereYear('date', (int) $year)->whereMonth('date', (int) $monthNumber);
            $dtrs->whereYear('dtr_date', (int) $year)->whereMonth('dtr_date', (int) $monthNumber);
        }

        return response()->json([
            'data' => DailyJournalResource::collection($journals->orderByDesc('date')->get()),
            'dtr' => PhotoDtrResource::collection($dtrs->orderByDesc('dtr_date')->get()),
        ]);
    }

    /**
     * Approve a record (journal or photo DTR) for a given date.
     */
    public function approve(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($user);

        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'type' => ['required', 'in:journal,dtr'],
        ]);

        if ($data['type'] === 'journal') {
            $journal = DailyJournal::where('intern_id', $intern->id)
                ->whereDate('date', $data['date'])
                ->firstOrFail();

            $journal->forceFill(['status' => 'checked'])->save();

            UserNotification::notify(
                $user,
                'journal_approved',
                'Journal approved',
                'Your journal for '.$data['date'].' was approved.',
                ['date' => $data['date']],
            );

            return response()->json([
                'data' => new DailyJournalResource($journal->fresh()->load('photos')),
            ]);
        }

        $dtr = PhotoDtr::where('intern_id', $intern->id)
            ->whereDate('dtr_date', $data['date'])
            ->firstOrFail();

        $dtr->forceFill(['status' => 'checked'])->save();

        UserNotification::notify(
            $user,
            'journal_approved',
            'DTR approved',
            'Your DTR for '.$data['date'].' was approved.',
            ['date' => $data['date']],
        );

        return response()->json([
            'data' => new PhotoDtrResource($dtr->fresh()->load(['verifier', 'checker'])),
        ]);
    }

    /**
     * Reject a record (journal or photo DTR) for a given date, with remarks.
     * Rejection is the final status — it also applies to HTE-flagged records.
     */
    public function reject(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($user);

        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'type' => ['required', 'in:journal,dtr'],
            'remarks' => ['required', 'string', 'max:1000'],
        ]);

        if ($data['type'] === 'journal') {
            $journal = DailyJournal::where('intern_id', $intern->id)
                ->whereDate('date', $data['date'])
                ->firstOrFail();

            $journal->forceFill([
                'status' => 'rejected',
                'remarks' => $data['remarks'],
            ])->save();

            UserNotification::notify(
                $user,
                'journal_rejected',
                'Journal rejected',
                'Your journal for '.$data['date'].' was rejected: '.$data['remarks'],
                ['date' => $data['date']],
            );

            return response()->json([
                'data' => new DailyJournalResource($journal->fresh()->load('photos')),
            ]);
        }

        $dtr = PhotoDtr::where('intern_id', $intern->id)
            ->whereDate('dtr_date', $data['date'])
            ->firstOrFail();

        $dtr->forceFill([
            'status' => 'rejected',
            'remarks' => $data['remarks'],
        ])->save();

        UserNotification::notify(
            $user,
            'journal_rejected',
            'DTR rejected',
            'Your DTR for '.$data['date'].' was rejected: '.$data['remarks'],
            ['date' => $data['date']],
        );

        return response()->json([
            'data' => new PhotoDtrResource($dtr->fresh()->load(['verifier', 'checker'])),
        ]);
    }

    /**
     * Ensure the intern exists and is currently deployed.
     */
    private function authorizeIntern(User $user): Intern
    {
        $intern = $user->intern;

        if (! $intern || $intern->ojt_status !== 'ongoing') {
            abort(404, 'This intern is not deployed.');
        }

        return $intern;
    }
}
