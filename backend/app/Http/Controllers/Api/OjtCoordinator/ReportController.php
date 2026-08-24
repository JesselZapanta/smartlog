<?php

namespace App\Http\Controllers\Api\OjtCoordinator;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Hte;
use App\Models\HteEvaluation;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\Issue;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $coordinator = $request->user()->coordinator;
        $instituteId = $coordinator?->institute_id;
        $institute = $coordinator?->institute;

        if (! $instituteId) {
            return response()->json([
                'data' => [
                    'institute' => null,
                    'academic_year' => null,
                    'interns' => ['total' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0, 'by_program' => [], 'by_ojt_status' => [], 'recent' => []],
                    'htes' => ['total' => 0, 'active' => 0, 'inactive' => 0, 'top_htes' => [], 'by_status' => [], 'detail' => []],
                    'dtr' => ['total' => 0, 'by_status' => [], 'recent' => []],
                    'journals' => ['total' => 0, 'recent' => []],
                    'requirements' => ['total' => 0, 'by_status' => [], 'definitions_total' => 0, 'by_requirement' => []],
                    'issues' => ['total' => 0, 'by_status' => [], 'by_type' => [], 'recent' => []],
                    'evaluations' => ['intern_ratings' => 0, 'hte_ratings' => 0, 'recent' => []],
                    'programs_list' => [],
                ],
            ]);
        }

        $academicYearId = $request->integer('academic_year_id');
        $activeTerm = AcademicTerm::where('status', 'active')->first();
        $targetYearId = $academicYearId ?: ($activeTerm?->id);

        $internBase = Intern::where('institute_id', $instituteId)
            ->when($targetYearId, fn ($q) => $q->where('academic_year_id', $targetYearId));

        $totalInterns = (clone $internBase)->count();
        $pendingInterns = (clone $internBase)->where('status', 'pending')->count();
        $approvedInterns = (clone $internBase)->where('status', 'approved')->count();
        $rejectedInterns = (clone $internBase)->where('status', 'rejected')->count();

        $internsByProgram = Program::where('institute_id', $instituteId)
            ->withCount(['interns' => function ($query) use ($targetYearId): void {
                if ($targetYearId) {
                    $query->where('academic_year_id', $targetYearId);
                }
            }])
            ->orderByDesc('interns_count')
            ->get()
            ->map(fn (Program $program): array => [
                'program' => $program->name,
                'total' => (int) $program->interns_count,
            ])
            ->values();

        $internsByOjtStatus = (clone $internBase)
            ->selectRaw('ojt_status, count(*) as total')
            ->groupBy('ojt_status')
            ->pluck('total', 'ojt_status');

        $dtrQuery = PhotoDtr::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)
            ->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
        $totalDtr = (clone $dtrQuery)->count();
        $dtrByStatus = (clone $dtrQuery)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $journalQuery = DailyJournal::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)
            ->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
        $totalJournals = (clone $journalQuery)->count();

        $requirementQuery = RequirementSubmission::whereHas('user.intern', fn ($q) => $q->where('institute_id', $instituteId)
            ->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
        $totalRequirements = (clone $requirementQuery)->count();
        $requirementsByStatus = (clone $requirementQuery)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $requirementDefinitions = Requirement::where('institute_id', $instituteId)->count();

        $issueQuery = Issue::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)
            ->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
        $totalIssues = (clone $issueQuery)->count();
        $issuesByStatus = (clone $issueQuery)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $issuesByType = (clone $issueQuery)
            ->selectRaw('type, count(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $evaluations = [
            'intern_ratings' => InternEvaluation::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)
                ->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)))->count(),
            'hte_ratings' => HteEvaluation::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)
                ->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)))->count(),
        ];

        $htesTotal = Hte::where('institute_id', $instituteId)->count();
        $htesActive = Hte::where('institute_id', $instituteId)->where('status', 'active')->count();
        $htesInactive = $htesTotal - $htesActive;

        $topHtes = Hte::where('institute_id', $instituteId)
            ->withCount(['assignedInterns' => function ($q) use ($targetYearId): void {
                if ($targetYearId) {
                    $q->where('academic_year_id', $targetYearId);
                }
            }])
            ->orderByDesc('assigned_interns_count')
            ->limit(10)
            ->get()
            ->map(fn (Hte $hte): array => [
                'name' => $hte->name,
                'total' => (int) $hte->assigned_interns_count,
                'status' => $hte->status,
            ])
            ->values();

        $programsList = Program::where('institute_id', $instituteId)
            ->select('id', 'name', 'is_active')
            ->get();

        $recentInterns = Intern::where('institute_id', $instituteId)
            ->when($targetYearId, fn ($q) => $q->where('academic_year_id', $targetYearId))
            ->with(['user', 'program'])
            ->join('users', 'interns.user_id', '=', 'users.id')
            ->orderByDesc('interns.created_at')
            ->limit(6)
            ->select('interns.*')
            ->get()
            ->map(fn (Intern $intern): array => [
                'name' => $intern->user ? trim(implode(' ', array_filter([$intern->user->firstname, $intern->user->middlename, $intern->user->lastname, $intern->user->extension]))) : '—',
                'program' => $intern->program?->name ?? '—',
                'status' => $intern->status,
                'ojt_status' => $intern->ojt_status,
                'created_at' => $intern->created_at?->toDateString(),
            ])
            ->values();

        $htesByStatus = Hte::where('institute_id', $instituteId)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $htesDetail = Hte::where('institute_id', $instituteId)
            ->withCount(['assignedInterns' => function ($q) use ($targetYearId): void {
                if ($targetYearId) {
                    $q->where('academic_year_id', $targetYearId);
                }
            }])
            ->orderByDesc('assigned_interns_count')
            ->get()
            ->map(fn (Hte $hte): array => [
                'name' => $hte->name,
                'status' => $hte->status,
                'assigned' => (int) $hte->assigned_interns_count,
            ])
            ->values();

        $requirementsByRequirement = Requirement::where('institute_id', $instituteId)
            ->get()
            ->map(function (Requirement $req) use ($instituteId, $targetYearId): array {
                $base = $req->submissions()->whereHas('user.intern', fn ($q) => $q->where('institute_id', $instituteId)->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
                $total = (clone $base)->count();

                return [
                    'name' => $req->name,
                    'type' => $req->type,
                    'is_active' => $req->is_active,
                    'total' => $total,
                    'approved' => (clone $base)->where('status', 'approved')->count(),
                    'pending' => (clone $base)->where('status', 'pending')->count(),
                    'rejected' => (clone $base)->where('status', 'rejected')->count(),
                    'compliance' => $total > 0 && $req->is_active ? round(((clone $base)->where('status', 'approved')->count() / max(1, $total)) * 100) : null,
                ];
            })
            ->values();

        $recentDtr = PhotoDtr::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
            ->with(['intern.user'])
            ->latest('dtr_date')
            ->limit(5)
            ->get()
            ->map(fn (PhotoDtr $dtr): array => [
                'student' => $dtr->intern?->user ? trim(implode(' ', array_filter([$dtr->intern->user->firstname, $dtr->intern->user->lastname]))) : '—',
                'date' => $dtr->dtr_date,
                'status' => $dtr->status,
            ])
            ->values();

        $recentJournals = DailyJournal::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
            ->with(['intern.user'])
            ->latest('date')
            ->limit(5)
            ->get()
            ->map(fn (DailyJournal $j): array => [
                'student' => $j->intern?->user ? trim(implode(' ', array_filter([$j->intern->user->firstname, $j->intern->user->lastname]))) : '—',
                'title' => $j->title ?? substr($j->content ?? '', 0, 40),
                'date' => $j->date,
            ])
            ->values();

        $recentIssues = Issue::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
            ->with(['intern.user'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Issue $issue): array => [
                'student' => $issue->intern?->user ? trim(implode(' ', array_filter([$issue->intern->user->firstname, $issue->intern->user->lastname]))) : '—',
                'type' => $issue->type,
                'status' => $issue->status,
                'excerpt' => mb_strimwidth($issue->issues ?? $issue->description ?? '', 0, 60, '…'),
            ])
            ->values();

        $recentEvaluations = InternEvaluation::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
            ->with(['intern.user'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (InternEvaluation $ev): array => [
                'student' => $ev->intern?->user ? trim(implode(' ', array_filter([$ev->intern->user->firstname, $ev->intern->user->lastname]))) : '—',
                'created_at' => $ev->created_at?->toDateString(),
            ])
            ->values();

        return response()->json([
            'data' => [
                'institute' => $institute ? ['id' => $institute->id, 'name' => $institute->name] : null,
                'academic_year' => $targetYearId ? AcademicTerm::find($targetYearId)?->only(['id', 'code', 'description']) : null,
                'interns' => [
                    'total' => $totalInterns,
                    'pending' => $pendingInterns,
                    'approved' => $approvedInterns,
                    'rejected' => $rejectedInterns,
                    'by_program' => $internsByProgram,
                    'by_ojt_status' => $internsByOjtStatus->toArray(),
                    'recent' => $recentInterns,
                ],
                'htes' => [
                    'total' => $htesTotal,
                    'active' => $htesActive,
                    'inactive' => $htesInactive,
                    'by_status' => $htesByStatus->toArray(),
                    'top_htes' => $topHtes,
                    'detail' => $htesDetail,
                ],
                'dtr' => [
                    'total' => $totalDtr,
                    'by_status' => $dtrByStatus->toArray(),
                    'recent' => $recentDtr,
                ],
                'journals' => [
                    'total' => $totalJournals,
                    'recent' => $recentJournals,
                ],
                'requirements' => [
                    'total' => $totalRequirements,
                    'by_status' => $requirementsByStatus->toArray(),
                    'definitions_total' => $requirementDefinitions,
                    'by_requirement' => $requirementsByRequirement,
                ],
                'issues' => [
                    'total' => $totalIssues,
                    'by_status' => $issuesByStatus->toArray(),
                    'by_type' => $issuesByType->toArray(),
                    'recent' => $recentIssues,
                ],
                'evaluations' => array_merge($evaluations, ['recent' => $recentEvaluations]),
                'programs_list' => $programsList,
            ],
        ]);
    }

    public function placement(Request $request): JsonResponse
    {
        $coordinator = $request->user()->coordinator;
        $instituteId = $coordinator?->institute_id;
        $institute = $coordinator?->institute;

        if (! $instituteId) {
            return response()->json([
                'data' => [
                    'institute' => null,
                    'academic_year' => null,
                    'coordinator_name' => $request->user()->full_name ?? $request->user()->firstname,
                    'rows' => [],
                ],
            ]);
        }

        $academicYearId = $request->integer('academic_year_id');
        $activeTerm = AcademicTerm::where('status', 'active')->first();
        $targetYearId = $academicYearId ?: ($activeTerm?->id);

        $interns = Intern::where('institute_id', $instituteId)
            ->when($targetYearId, fn ($q) => $q->where('academic_year_id', $targetYearId))
            ->with(['user', 'program', 'assignedHte.user'])
            ->join('users', 'interns.user_id', '=', 'users.id')
            ->orderBy('users.lastname')
            ->orderBy('users.firstname')
            ->select('interns.*')
            ->get();

        $rows = $interns->map(function (Intern $intern): array {
            $user = $intern->user;
            $hte = $intern->assignedHte;

            return [
                'student_name' => $user ? trim(implode(' ', array_filter([$user->firstname, $user->middlename, $user->lastname, $user->extension]))) : '—',
                'program' => $intern->program?->name ?? '—',
                'company' => $hte?->name ?? '',
                'department' => '',
                'supervisor' => $hte?->user ? trim(implode(' ', array_filter([$hte->user->firstname, $hte->user->middlename, $hte->user->lastname, $hte->user->extension]))) : '',
                'ojt_start' => $intern->start_date?->format('F j, Y'),
                'ojt_end' => $intern->end_date?->format('F j, Y'),
                'ojt_status' => $intern->ojt_status,
                'intern_status' => $intern->status,
            ];
        })->values();

        return response()->json([
            'data' => [
                'institute' => $institute ? ['id' => $institute->id, 'name' => $institute->name] : null,
                'academic_year' => $targetYearId ? AcademicTerm::find($targetYearId)?->only(['id', 'code', 'description']) : null,
                'coordinator_name' => $request->user()->full_name ?? trim(implode(' ', array_filter([$request->user()->firstname, $request->user()->middlename, $request->user()->lastname]))),
                'rows' => $rows,
            ],
        ]);
    }
}
