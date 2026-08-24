<?php

namespace App\Http\Controllers\Api\Hte;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\DailyJournal;
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
        $hte = $request->user()->hte;

        if (! $hte) {
            return response()->json([
                'data' => [
                    'hte' => null,
                    'institute' => null,
                    'academic_year' => null,
                    'users' => ['total' => 0, 'by_role' => []],
                    'interns' => ['total' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0, 'by_institute' => [], 'by_program' => [], 'by_ojt_status' => [], 'recent' => []],
                    'htes' => ['total' => 0, 'by_status' => [], 'detail' => []],
                    'dtr' => ['total' => 0, 'by_status' => [], 'recent' => []],
                    'journals' => ['total' => 0, 'recent' => []],
                    'requirements' => ['total' => 0, 'by_status' => [], 'definitions_total' => 0, 'by_requirement' => []],
                    'issues' => ['total' => 0, 'by_status' => [], 'by_type' => [], 'recent' => []],
                    'evaluations' => ['total' => 0, 'recent' => []],
                    'programs' => ['total' => 0],
                    'institutes' => ['total' => 0, 'list' => []],
                    'programs_list' => [],
                    'academic_terms' => ['total' => 0, 'list' => []],
                    'ojt_hours' => [],
                ],
            ]);
        }

        $institute = $hte->institute;
        $instituteId = $hte->institute_id;

        $academicYearId = $request->integer('academic_year_id');
        $activeTerm = AcademicTerm::where('status', 'active')->first();
        $targetYearId = $academicYearId ?: ($activeTerm?->id);

        $internQuery = Intern::where('assigned_hte', $hte->id)->when($targetYearId, fn ($q) => $q->where('academic_year_id', $targetYearId));

        $totalInterns = (clone $internQuery)->count();
        $pendingInterns = (clone $internQuery)->where('status', 'pending')->count();
        $approvedInterns = (clone $internQuery)->where('status', 'approved')->count();
        $rejectedInterns = (clone $internQuery)->where('status', 'rejected')->count();

        $internsByProgram = Program::where('institute_id', $instituteId)
            ->withCount(['interns' => function ($q) use ($hte, $targetYearId): void {
                $q->where('assigned_hte', $hte->id);
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

        $internsByOjtStatus = (clone $internQuery)->selectRaw('ojt_status, count(*) as total')->groupBy('ojt_status')->pluck('total', 'ojt_status');

        $recentInterns = Intern::where('assigned_hte', $hte->id)
            ->when($targetYearId, fn ($q) => $q->where('academic_year_id', $targetYearId))
            ->with(['user', 'institute', 'program'])
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

        $dtrQuery = PhotoDtr::whereHas('intern', fn ($q) => $q->where('assigned_hte', $hte->id)->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
        $totalDtr = (clone $dtrQuery)->count();
        $dtrByStatus = (clone $dtrQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $recentDtr = (clone $dtrQuery)->with(['intern.user'])->latest('dtr_date')->limit(5)->get()->map(fn (PhotoDtr $d): array => [
            'student' => $d->intern?->user ? trim(implode(' ', array_filter([$d->intern->user->firstname, $d->intern->user->lastname]))) : '—',
            'date' => $d->dtr_date,
            'status' => $d->status,
        ])->values();

        $journalQuery = DailyJournal::whereHas('intern', fn ($q) => $q->where('assigned_hte', $hte->id)->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
        $totalJournals = (clone $journalQuery)->count();
        $recentJournals = (clone $journalQuery)->with(['intern.user'])->latest('date')->limit(5)->get()->map(fn (DailyJournal $j): array => [
            'student' => $j->intern?->user ? trim(implode(' ', array_filter([$j->intern->user->firstname, $j->intern->user->lastname]))) : '—',
            'title' => $j->title ?? mb_strimwidth($j->content ?? '', 0, 40, '…'),
            'date' => $j->date,
        ])->values();

        $requirementQuery = RequirementSubmission::whereHas('user.intern', fn ($q) => $q->where('assigned_hte', $hte->id)->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
        $totalRequirements = (clone $requirementQuery)->count();
        $requirementsByStatus = (clone $requirementQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $totalRequirementsDef = Requirement::where('institute_id', $instituteId)->count();
        $requirementsByRequirement = Requirement::where('institute_id', $instituteId)->get()->map(function (Requirement $req) use ($hte, $targetYearId): array {
            $base = $req->submissions()->whereHas('user.intern', fn ($q) => $q->where('assigned_hte', $hte->id)->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
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

        $issueQuery = Issue::whereHas('intern', fn ($q) => $q->where('assigned_hte', $hte->id)->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
        $totalIssues = (clone $issueQuery)->count();
        $issuesByStatus = (clone $issueQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $issuesByType = (clone $issueQuery)->selectRaw('type, count(*) as total')->groupBy('type')->pluck('total', 'type');
        $recentIssues = (clone $issueQuery)->with(['intern.user'])->latest()->limit(5)->get()->map(fn (Issue $i): array => [
            'student' => $i->intern?->user ? trim(implode(' ', array_filter([$i->intern->user->firstname, $i->intern->user->lastname]))) : '—',
            'type' => $i->type,
            'status' => $i->status,
            'excerpt' => mb_strimwidth($i->issues ?? $i->description ?? '', 0, 60, '…'),
        ])->values();

        $evaluationQuery = InternEvaluation::where('hte_id', $hte->id)->whereHas('intern', fn ($q) => $q->when($targetYearId, fn ($qq) => $qq->where('academic_year_id', $targetYearId)));
        $totalEvaluations = (clone $evaluationQuery)->count();
        $recentEvaluations = (clone $evaluationQuery)->with(['intern.user'])->latest()->limit(5)->get()->map(fn (InternEvaluation $ev): array => [
            'student' => $ev->intern?->user ? trim(implode(' ', array_filter([$ev->intern->user->firstname, $ev->intern->user->lastname]))) : '—',
            'created_at' => $ev->created_at?->toDateString(),
        ])->values();

        $totalHtes = 1;
        $htesByStatus = collect([$hte->status => 1]);
        $htesDetail = collect([['name' => $hte->name, 'status' => $hte->status, 'assigned' => $totalInterns]]);

        $totalInstitutes = 1;
        $institutes = Institute::where('id', $instituteId)->select('id', 'name', 'is_active')->withCount('programs')->get();
        $totalPrograms = Program::where('institute_id', $instituteId)->count();
        $programsList = Program::where('institute_id', $instituteId)->with('institute:id,name')->select('id', 'institute_id', 'name', 'is_active')->get();
        $totalAcademicTerms = AcademicTerm::count();
        $academicTerms = AcademicTerm::select('id', 'code', 'description', 'status', 'start_at', 'end_at')->orderByDesc('id')->get();
        $ojtHours = OjtHour::where('institute_id', $instituteId)->with('institute:id,name')->get();

        $totalUsers = User::where('role', 'intern')->whereHas('intern', fn ($q) => $q->where('assigned_hte', $hte->id))->count();

        return response()->json([
            'data' => [
                'hte' => ['id' => $hte->id, 'name' => $hte->name],
                'institute' => $institute ? ['id' => $institute->id, 'name' => $institute->name] : null,
                'academic_year' => $targetYearId ? AcademicTerm::find($targetYearId)?->only(['id', 'code', 'description']) : null,
                'users' => [
                    'total' => $totalUsers,
                    'by_role' => ['intern' => $totalUsers],
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
                    'detail' => $htesDetail->values(),
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
