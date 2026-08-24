<?php

namespace App\Http\Controllers\Api\Admin;

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

        $internsByInstitute = (clone $internQuery)
            ->join('institutes', 'interns.institute_id', '=', 'institutes.id')
            ->selectRaw('institutes.name as institute, count(*) as total')
            ->groupBy('institutes.name')
            ->orderByDesc('total')
            ->get();

        $internsByProgram = (clone $internQuery)
            ->join('programs', 'interns.program_id', '=', 'programs.id')
            ->selectRaw('programs.name as program, count(*) as total')
            ->groupBy('programs.name')
            ->orderByDesc('total')
            ->get();

        $internsByOjtStatus = (clone $internQuery)
            ->selectRaw('ojt_status, count(*) as total')
            ->groupBy('ojt_status')
            ->pluck('total', 'ojt_status');

        $dtrQuery = PhotoDtr::query();
        if ($targetYearId) {
            $dtrQuery->whereHas('intern', fn ($q) => $q->where('academic_year_id', $targetYearId));
        }
        $totalDtr = (clone $dtrQuery)->count();
        $dtrByStatus = (clone $dtrQuery)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $journalQuery = DailyJournal::query();
        if ($targetYearId) {
            $journalQuery->whereHas('intern', fn ($q) => $q->where('academic_year_id', $targetYearId));
        }
        $totalJournals = (clone $journalQuery)->count();

        $requirementQuery = RequirementSubmission::query();
        if ($targetYearId) {
            $requirementQuery->whereHas('user', function ($q) use ($targetYearId) {
                $q->whereHas('intern', fn ($iq) => $iq->where('academic_year_id', $targetYearId));
            });
        }
        $totalRequirements = (clone $requirementQuery)->count();
        $requirementsByStatus = (clone $requirementQuery)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $issueQuery = Issue::query();
        if ($targetYearId) {
            $issueQuery->whereHas('intern', fn ($q) => $q->where('academic_year_id', $targetYearId));
        }
        $totalIssues = (clone $issueQuery)->count();
        $issuesByStatus = (clone $issueQuery)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $issuesByType = (clone $issueQuery)
            ->selectRaw('type, count(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $evaluationQuery = InternEvaluation::query();
        if ($targetYearId) {
            $evaluationQuery->whereHas('intern', fn ($q) => $q->where('academic_year_id', $targetYearId));
        }
        $totalEvaluations = (clone $evaluationQuery)->count();

        $totalUsers = User::count();
        $usersByRole = User::selectRaw('role, count(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role');
        $verifiedUsers = User::whereNotNull('email_verified_at')->count();
        $unverifiedUsers = User::whereNull('email_verified_at')->count();

        $totalHtes = Hte::count();
        $htesByStatus = Hte::selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $totalPrograms = Program::count();
        $totalInstitutes = Institute::count();
        $totalAcademicTerms = AcademicTerm::count();
        $totalRequirementsDef = Requirement::count();
        $totalInternsAll = Intern::count();

        $institutes = Institute::select('id', 'name', 'is_active')->withCount('programs')->get();
        $programsList = Program::with('institute:id,name')->select('id', 'institute_id', 'name', 'is_active')->get();
        $academicTerms = AcademicTerm::select('id', 'code', 'description', 'status', 'start_at', 'end_at')->orderByDesc('id')->get();
        $ojtHours = OjtHour::with('institute:id,name')->get();

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

        $htesDetail = Hte::withCount(['assignedInterns' => function ($q) use ($targetYearId): void {
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

        $htesByStatusDetail = $htesByStatus->toArray();

        $requirementsByRequirement = Requirement::get()
            ->map(function (Requirement $req) use ($targetYearId): array {
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
            })
            ->values();

        $recentDtr = PhotoDtr::when($targetYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
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

        $recentJournals = DailyJournal::when($targetYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
            ->with(['intern.user'])
            ->latest('date')
            ->limit(5)
            ->get()
            ->map(fn (DailyJournal $j): array => [
                'student' => $j->intern?->user ? trim(implode(' ', array_filter([$j->intern->user->firstname, $j->intern->user->lastname]))) : '—',
                'title' => $j->title ?? mb_strimwidth($j->content ?? '', 0, 40, '…'),
                'date' => $j->date,
            ])
            ->values();

        $recentIssues = Issue::when($targetYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
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

        $recentEvaluations = InternEvaluation::when($targetYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
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
                'academic_year' => $targetYearId ? AcademicTerm::find($targetYearId)?->only(['id', 'code', 'description']) : null,
                'users' => [
                    'total' => $totalUsers,
                    'by_role' => $usersByRole->toArray(),
                    'verified' => $verifiedUsers,
                    'unverified' => $unverifiedUsers,
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
                    'by_status_detail' => $htesByStatusDetail,
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
                'totals_all_time' => [
                    'interns' => $totalInternsAll,
                ],
            ],
        ]);
    }
}
