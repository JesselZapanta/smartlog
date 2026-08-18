<?php

namespace App\Http\Controllers\Api\Hte;

use App\Http\Controllers\Controller;
use App\Http\Resources\Intern\DailyJournalResource;
use App\Http\Resources\Intern\PhotoDtrResource;
use App\Models\DailyJournal;
use App\Models\Intern;
use App\Models\PhotoDtr;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternRecordController extends Controller
{
    /**
     * An assigned intern's journals and photo DTR records, scoped to a month
     * (or a single date when `date` is given).
     */
    public function index(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);

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
     * Verify a record (journal or photo DTR) for a given date.
     */
    public function verify(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);

        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'type' => ['required', 'in:journal,dtr'],
        ]);

        if ($data['type'] === 'journal') {
            $journal = DailyJournal::where('intern_id', $intern->id)
                ->whereDate('date', $data['date'])
                ->firstOrFail();

            $journal->forceFill(['status' => 'verified'])->save();

            return response()->json([
                'data' => new DailyJournalResource($journal->fresh()->load('photos')),
            ]);
        }

        $dtr = PhotoDtr::where('intern_id', $intern->id)
            ->whereDate('dtr_date', $data['date'])
            ->firstOrFail();

        $dtr->forceFill([
            'status' => 'verified',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ])->save();

        return response()->json([
            'data' => new PhotoDtrResource($dtr->fresh()->load(['verifier', 'checker'])),
        ]);
    }

    /**
     * Flag a record (journal or photo DTR) for a given date, with remarks.
     */
    public function flag(Request $request, User $user): JsonResponse
    {
        $intern = $this->authorizeIntern($request, $user);

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
                'status' => 'flagged',
                'remarks' => $data['remarks'],
            ])->save();

            return response()->json([
                'data' => new DailyJournalResource($journal->fresh()->load('photos')),
            ]);
        }

        $dtr = PhotoDtr::where('intern_id', $intern->id)
            ->whereDate('dtr_date', $data['date'])
            ->firstOrFail();

        $dtr->forceFill([
            'status' => 'flagged',
            'remarks' => $data['remarks'],
        ])->save();

        return response()->json([
            'data' => new PhotoDtrResource($dtr->fresh()->load(['verifier', 'checker'])),
        ]);
    }

    /**
     * Ensure the intern is assigned to the authenticated HTE.
     */
    private function authorizeIntern(Request $request, User $user): Intern
    {
        $hte = $request->user()->hte;

        if (! $hte) {
            abort(403, 'Your account is not linked to an HTE profile.');
        }

        $intern = $user->intern;

        if (! $intern) {
            abort(404, 'This user has no intern record.');
        }

        if ($intern->assigned_hte !== $hte->id) {
            abort(403, 'This intern is not assigned to your establishment.');
        }

        return $intern;
    }
}
