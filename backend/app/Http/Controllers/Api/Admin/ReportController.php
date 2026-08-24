<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Hte;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\Issue;
use App\Models\PhotoDtr;
use App\Models\Program;
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
        $totalInternsAll = Intern::count();

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
                ],
                'htes' => [
                    'total' => $totalHtes,
                    'by_status' => $htesByStatus->toArray(),
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
                ],
                'issues' => [
                    'total' => $totalIssues,
                    'by_status' => $issuesByStatus->toArray(),
                    'by_type' => $issuesByType->toArray(),
                ],
                'evaluations' => [
                    'total' => $totalEvaluations,
                ],
                'programs' => [
                    'total' => $totalPrograms,
                ],
                'totals_all_time' => [
                    'interns' => $totalInternsAll,
                ],
            ],
        ]);
    }
}
