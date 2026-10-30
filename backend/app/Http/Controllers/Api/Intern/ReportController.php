<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Intern;
use App\Models\PhotoDtr;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Support\StorageUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        // Resolving the requested term directly replaces the old "AY mismatch"
        // blanking: a re-enrolled intern now has a real row per term, so asking
        // for an older term returns that term's data instead of nothing.
        $intern = $user->enrollmentFor($request->integer('academic_year_id') ?: null);

        if (! $intern) {
            return response()->json([
                'data' => [
                    'intern' => null,
                    'hte' => null,
                    'institute' => null,
                    'academic_year' => null,
                    'ojt_hours' => ['required' => null, 'earned' => 0, 'remaining' => 0, 'progress' => 0],
                    'dtr' => ['total' => 0, 'by_status' => [], 'recent' => [], 'rows' => []],
                    'journals' => ['total' => 0, 'recent' => [], 'rows' => []],
                    'requirements' => ['total' => 0, 'by_status' => [], 'definitions_total' => 0, 'by_requirement' => [], 'rows' => []],
                ],
            ]);
        }

        $intern->loadMissing(['institute', 'program', 'academicYear', 'assignedHte.user']);

        $activeTerm = AcademicTerm::where('status', 'active')->first();
        $targetYearId = $intern->academic_year_id ?: ($activeTerm?->id);

        // OJT hours. `required` is null until the intern declares hours on an OJT enrollment
        // for the term, so the report shows a dash rather than a zero-hour target.
        $requiredHours = $intern->requiredHours();
        $earnedMinutes = $intern->earnedMinutes();
        $earnedHours = (int) floor($earnedMinutes / 60);
        $remainingMinutes = max(0, ($requiredHours ?? 0) * 60 - $earnedMinutes);
        $remainingHours = (int) floor($remainingMinutes / 60);
        $hoursProgress = $requiredHours > 0 ? min(100, round(($earnedMinutes / ($requiredHours * 60)) * 100)) : 0;

        // DTR and journals belong to the resolved enrollment.
        $dtrBase = PhotoDtr::where('intern_id', $intern->id);
        $totalDtr = (clone $dtrBase)->count();
        $dtrByStatus = (clone $dtrBase)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $dtrRows = (clone $dtrBase)->oldest('dtr_date')->get()->map(fn (PhotoDtr $d): array => [
            'date' => $d->dtr_date?->toDateString(),
            'am_in' => $d->am_in_time,
            'am_out' => $d->am_out_time,
            'pm_in' => $d->pm_in_time,
            'pm_out' => $d->pm_out_time,
            'status' => $d->status,
        ])->values();
        $recentDtr = (clone $dtrBase)->latest('dtr_date')->limit(5)->get()->map(fn (PhotoDtr $d): array => [
            'date' => $d->dtr_date,
            'am_in' => $d->am_in_time,
            'am_out' => $d->am_out_time,
            'pm_in' => $d->pm_in_time,
            'pm_out' => $d->pm_out_time,
            'status' => $d->status,
        ])->values();

        $journalBase = DailyJournal::where('intern_id', $intern->id);
        $totalJournals = (clone $journalBase)->count();
        $recentJournals = (clone $journalBase)->with('photos')->latest('date')->limit(5)->get()->map(fn (DailyJournal $j): array => [
            'date' => $j->date,
            'title' => $j->title,
            'journal' => $j->journal,
            'status' => $j->status,
            'photos' => $j->photos->map(fn ($p) => StorageUrl::url($p->photo))->filter()->values(),
        ])->values();
        $journalRows = (clone $journalBase)->with('photos')->oldest('date')->get()->map(fn (DailyJournal $j): array => [
            'date' => $j->date?->toDateString(),
            'title' => $j->title,
            'journal' => $j->journal,
            'status' => $j->status,
            'photos' => $j->photos->map(fn ($p) => StorageUrl::url($p->photo))->filter()->values(),
        ])->values();

        // Requirements are institute-scoped definitions, but the submissions belong to
        // the resolved enrollment, so a re-enrolled intern sees each term's own set.
        $instituteId = $intern->institute_id;
        $requirementQuery = RequirementSubmission::where('intern_id', $intern->id);
        $totalRequirements = (clone $requirementQuery)->count();
        $requirementsByStatus = (clone $requirementQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $requirementRows = (clone $requirementQuery)
            ->with('requirement')
            ->oldest('id')
            ->get()
            ->map(fn (RequirementSubmission $s): array => [
                'requirement' => $s->requirement?->name ?? '—',
                'type' => $s->requirement?->type ?? '—',
                'status' => $s->status,
                'submitted_at' => $s->created_at?->toDateString(),
                'reviewed_at' => $s->reviewed_at?->toDateString(),
                'rejection_reason' => $s->rejection_reason,
            ])
            ->values();
        $totalRequirementsDef = $instituteId ? Requirement::where('institute_id', $instituteId)->count() : 0;
        $requirementsByRequirement = collect();
        if ($instituteId) {
            $requirementsByRequirement = Requirement::where('institute_id', $instituteId)->get()->map(function (Requirement $req) use ($intern): array {
                $base = $req->submissions()->where('intern_id', $intern->id);
                $total = (clone $base)->count();

                return [
                    'name' => $req->name,
                    'type' => $req->type,
                    'is_active' => $req->is_active,
                    'total' => $total,
                    'approved' => (clone $base)->where('status', 'approved')->count(),
                    'pending' => (clone $base)->where('status', 'pending')->count(),
                    'rejected' => (clone $base)->where('status', 'rejected')->count(),
                ];
            })->values();
        }

        $hte = $intern->assignedHte;
        $academicYear = $targetYearId ? AcademicTerm::find($targetYearId) : $intern->academicYear;
        if (! $academicYear && $intern->academicYear) {
            $academicYear = $intern->academicYear;
        }

        return response()->json([
            'data' => [
                'intern' => [
                    'institute' => $intern->institute?->name,
                    'program' => $intern->program?->name,
                    'academic_year' => $intern->academicYear?->code,
                    'status' => $intern->status,
                    'ojt_status' => $intern->ojt_status,
                ],
                'hte' => $hte ? ['name' => $hte->name, 'status' => $hte->status] : null,
                'institute' => $intern->institute ? ['id' => $intern->institute->id, 'name' => $intern->institute->name] : null,
                'academic_year' => $academicYear ? $academicYear->only(['id', 'code', 'description']) : null,
                'ojt_hours' => [
                    'required' => $requiredHours ?? 0,
                    'earned' => $earnedHours,
                    'earned_minutes' => $earnedMinutes,
                    'remaining' => $remainingHours,
                    'progress' => $hoursProgress,
                ],
                'dtr' => [
                    'total' => $totalDtr,
                    'by_status' => $dtrByStatus->toArray(),
                    'recent' => $recentDtr,
                    'rows' => $dtrRows,
                ],
                'journals' => [
                    'total' => $totalJournals,
                    'recent' => $recentJournals,
                    'rows' => $journalRows,
                ],
                'requirements' => [
                    'total' => $totalRequirements,
                    'by_status' => $requirementsByStatus->toArray(),
                    'definitions_total' => $totalRequirementsDef,
                    'by_requirement' => $requirementsByRequirement,
                    'rows' => $requirementRows,
                ],
            ],
        ]);
    }
}
