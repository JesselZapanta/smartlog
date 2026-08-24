<?php

namespace App\Http\Controllers\Api\OjtInstructor;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\Issue;
use App\Models\OjtHour;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $academicYearId = $request->integer('academic_year_id');
        $activeTerm = AcademicTerm::where('status', 'active')->first();
        $targetYearId = $academicYearId ?: ($activeTerm?->id);

        $internQuery = Intern::query();
        if ($targetYearId) {
            $internQuery->where('academic_year_id', $targetYearId);
        }

        $totalInterns = (clone $internQuery)->count();
        $pendingInterns = (clone $internQuery)->where('status', 'pending')->count();
        $approvedInterns = (clone $internQuery)->where('status', 'approved')->count();
        $rejectedInterns = (clone $internQuery)->where('status', 'rejected')->count();

        $internsByProgram = Program::withCount(['interns' => function ($q) use ($targetYearId): void {
            if ($targetYearId) {
                $q->where('academic_year_id', $targetYearId);
            }
        }])
            ->orderByDesc('interns_count')
            ->get()
            ->map(fn (Program $p): array => ['program' => $p->name, 'total' => (int) $p->interns_count])
            ->values();

        $internsByInstitute = (clone $internQuery)
            ->join('institutes', 'interns.institute_id', '=', 'institutes.id')
            ->selectRaw('institutes.name as institute, count(*) as total')
            ->groupBy('institutes.name')
            ->orderByDesc('total')
            ->get();

        $internsByOjtStatus = (clone $internQuery)
            ->selectRaw('ojt_status, count(*) as total')
            ->groupBy('ojt_status')
            ->pluck('total', 'ojt_status');

        $recentInterns = Intern::with(['user', 'institute', 'program'])
            ->when($targetYearId, fn ($q) => $q->where('academic_year_id', $targetYearId))
            ->join('users', 'interns.user_id', '=', 'users.id')
            ->orderByDesc('interns.created_at')
            ->limit(6)
            ->select('interns.*')
            ->get()
            ->map(fn (Intern $intern): array => [
                'name' => $intern->user ? trim(implode(' ', array_filter([$intern->user->firstname, $intern->user->middlename, $intern->user->lastname, $intern->user->extension]))) : '—',
                'institute' => $intern->institute?->name ?? '—',
                'program' => $intern->program?->name ?? '—',
                'status' => $intern->status,
                'ojt_status' => $intern->ojt_status,
            ])
            ->values();

        $dtrQuery = PhotoDtr::query();
        if ($targetYearId) {
            $dtrQuery->whereHas('intern', fn ($q) => $q->where('academic_year_id', $targetYearId));
        }
        $totalDtr = (clone $dtrQuery)->count();
        $dtrByStatus = (clone $dtrQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $recentDtr = (clone $dtrQuery)->with(['intern.user'])->latest('dtr_date')->limit(5)->get()->map(fn (PhotoDtr $d): array => [
            'student' => $d->intern?->user ? trim(implode(' ', array_filter([$d->intern->user->firstname, $d->intern->user->lastname]))) : '—',
            'date' => $d->dtr_date,
            'status' => $d->status,
        ])->values();

        $journalQuery = DailyJournal::query();
        if ($targetYearId) {
            $journalQuery->whereHas('intern', fn ($q) => $q->where('academic_year_id', $targetYearId));
        }
        $totalJournals = (clone $journalQuery)->count();
        $recentJournals = (clone $journalQuery)->with(['intern.user'])->latest('date')->limit(5)->get()->map(fn (DailyJournal $j): array => [
            'student' => $j->intern?->user ? trim(implode(' ', array_filter([$j->intern->user->firstname, $j->intern->user->lastname]))) : '—',
            'title' => $j->title ?? mb_strimwidth($j->content ?? '', 0, 40, '…'),
            'date' => $j->date,
        ])->values();

        $requirementQuery = RequirementSubmission::query();
        if ($targetYearId) {
            $requirementQuery->whereHas('user', function ($q) use ($targetYearId) {
                $q->whereHas('intern', fn ($iq) => $iq->where('academic_year_id', $targetYearId));
            });
        }
        $totalRequirements = (clone $requirementQuery)->count();
        $requirementsByStatus = (clone $requirementQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $totalRequirementsDef = Requirement::count();
        $requirementsByRequirement = Requirement::get()->map(function (Requirement $req) use ($targetYearId): array {
            $base = $req->submissions()->when($targetYearId, fn ($q) => $q->whereHas('user.intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
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

        $issueQuery = Issue::query();
        if ($targetYearId) {
            $issueQuery->whereHas('intern', fn ($q) => $q->where('academic_year_id', $targetYearId));
        }
        $totalIssues = (clone $issueQuery)->count();
        $issuesByStatus = (clone $issueQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $issuesByType = (clone $issueQuery)->selectRaw('type, count(*) as total')->groupBy('type')->pluck('total', 'type');
        $recentIssues = (clone $issueQuery)->with(['intern.user'])->latest()->limit(5)->get()->map(fn (Issue $i): array => [
            'student' => $i->intern?->user ? trim(implode(' ', array_filter([$i->intern->user->firstname, $i->intern->user->lastname]))) : '—',
            'type' => $i->type,
            'status' => $i->status,
            'excerpt' => mb_strimwidth($i->issues ?? $i->description ?? '', 0, 60, '…'),
        ])->values();

        $evaluationQuery = InternEvaluation::query();
        if ($targetYearId) {
            $evaluationQuery->whereHas('intern', fn ($q) => $q->where('academic_year_id', $targetYearId));
        }
        $totalEvaluations = (clone $evaluationQuery)->count();
        $recentEvaluations = (clone $evaluationQuery)->with(['intern.user'])->latest()->limit(5)->get()->map(fn (InternEvaluation $ev): array => [
            'student' => $ev->intern?->user ? trim(implode(' ', array_filter([$ev->intern->user->firstname, $ev->intern->user->lastname]))) : '—',
            'created_at' => $ev->created_at?->toDateString(),
        ])->values();

        $totalUsers = User::count();
        $usersByRole = User::selectRaw('role, count(*) as total')->groupBy('role')->pluck('total', 'role');

        $totalHtes = Hte::count();
        $htesByStatus = Hte::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $htesDetail = Hte::withCount(['assignedInterns' => function ($q) use ($targetYearId): void {
            if ($targetYearId) {
                $q->where('academic_year_id', $targetYearId);
            }
        }])->orderByDesc('assigned_interns_count')->get()->map(fn (Hte $h): array => [
            'name' => $h->name,
            'status' => $h->status,
            'assigned' => (int) $h->assigned_interns_count,
        ])->values();

        $totalInstitutes = Institute::count();
        $institutes = Institute::select('id', 'name', 'is_active')->withCount('programs')->get();
        $totalPrograms = Program::count();
        $programsList = Program::with('institute:id,name')->select('id', 'institute_id', 'name', 'is_active')->get();
        $totalAcademicTerms = AcademicTerm::count();
        $academicTerms = AcademicTerm::select('id', 'code', 'description', 'status', 'start_at', 'end_at')->orderByDesc('id')->get();
        $ojtHours = OjtHour::with('institute:id,name')->get();

        return response()->json([
            'data' => [
                'academic_year' => $targetYearId ? AcademicTerm::find($targetYearId)?->only(['id', 'code', 'description']) : null,
                'users' => [
                    'total' => $totalUsers,
                    'by_role' => $usersByRole->toArray(),
                ],
                'interns' => [
                    'total' => $totalInterns,
                    'pending' => $pendingInterns,
                    'approved' => $approvedInterns,
                    'rejected' => $rejectedInterns,
                    'by_institute' => $internsByInstitute,
                    'by_program' => $internsByProgram,
                    'by_ojt_status' => $internsByOjtStatus->toArray(),
                    'recent' => $recentInterns,
                ],
                'htes' => [
                    'total' => $totalHtes,
                    'by_status' => $htesByStatus->toArray(),
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
                    'definitions_total' => $totalRequirementsDef,
                    'by_requirement' => $requirementsByRequirement,
                ],
                'issues' => [
                    'total' => $totalIssues,
                    'by_status' => $issuesByStatus->toArray(),
                    'by_type' => $issuesByType->toArray(),
                    'recent' => $recentIssues,
                ],
                'evaluations' => [
                    'total' => $totalEvaluations,
                    'recent' => $recentEvaluations,
                ],
                'programs' => [
                    'total' => $totalPrograms,
                ],
                'institutes' => [
                    'total' => $totalInstitutes,
                    'list' => $institutes,
                ],
                'programs_list' => $programsList,
                'academic_terms' => [
                    'total' => $totalAcademicTerms,
                    'list' => $academicTerms,
                ],
                'ojt_hours' => $ojtHours,
            ],
        ]);
    }
}
