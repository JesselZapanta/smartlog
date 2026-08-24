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
                    'interns' => ['total' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0, 'by_program' => [], 'by_ojt_status' => []],
                    'htes' => ['total' => 0, 'active' => 0, 'inactive' => 0, 'top_htes' => []],
                    'dtr' => ['total' => 0, 'by_status' => []],
                    'journals' => ['total' => 0],
                    'requirements' => ['total' => 0, 'by_status' => [], 'definitions_total' => 0],
                    'issues' => ['total' => 0, 'by_status' => [], 'by_type' => []],
                    'evaluations' => ['intern_ratings' => 0, 'hte_ratings' => 0],
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
                ],
                'htes' => [
                    'total' => $htesTotal,
                    'active' => $htesActive,
                    'inactive' => $htesInactive,
                    'top_htes' => $topHtes,
                ],
                'dtr' => [
                    'total' => $totalDtr,
                    'by_status' => $dtrByStatus->toArray(),
                ],
                'journals' => [
                    'total' => $totalJournals,
                ],
                'requirements' => [
                    'total' => $totalRequirements,
                    'by_status' => $requirementsByStatus->toArray(),
                    'definitions_total' => $requirementDefinitions,
                ],
                'issues' => [
                    'total' => $totalIssues,
                    'by_status' => $issuesByStatus->toArray(),
                    'by_type' => $issuesByType->toArray(),
                ],
                'evaluations' => $evaluations,
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
