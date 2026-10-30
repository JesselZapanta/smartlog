<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Hte;
use App\Models\HteEvaluation;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\Issue;
use App\Models\OjtEnrollment;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\RequirementSubmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => match ($user->role) {
                'admin' => $this->adminDashboard($request),
                'ojt_coordinator' => $this->coordinatorDashboard($request),
                'ojt_instructor' => $this->instructorDashboard($request),
                'intern' => $this->internDashboard($request),
                'hte' => $this->hteDashboard($request),
                default => ['role' => $user->role],
            },
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function adminDashboard(Request $request): array
    {
        $requestedDays = (int) $request->integer('days');
        $allowedDays = [15, 30, 60, 90];
        $days = in_array($requestedDays, $allowedDays, true) ? $requestedDays : 30;

        $activeTerm = AcademicTerm::where('status', 'active')
            ->latest('start_at')
            ->first();

        $filterYearId = null;
        if ($request->filled('academic_year_id')) {
            $candidate = (int) $request->input('academic_year_id');
            if ($candidate > 0) {
                $filterYearId = $candidate;
            }
        } else {
            $filterYearId = $activeTerm?->id;
        }

        $now = now();
        $trendStart = $now->copy()->subDays($days - 1)->startOfDay();

        $internStatusCounts = Intern::query()
            ->when($filterYearId, fn ($query) => $query->where('academic_year_id', $filterYearId))
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $internStatusLabels = [
            'pending' => 'Pending',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
        ];

        $internStatusBreakdown = collect($internStatusLabels)
            ->map(fn ($label, $status): array => [
                'status' => $status,
                'label' => $label,
                'count' => (int) ($internStatusCounts[$status] ?? 0),
            ])
            ->values()
            ->all();

        $dtrStatusCounts = PhotoDtr::query()
            ->when($filterYearId, fn ($query) => $query->whereHas('intern', fn ($q) => $q->where('academic_year_id', $filterYearId)))
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $dtrStatusLabels = [
            'pending' => 'Pending',
            'checked' => 'Checked',
            'verified' => 'Verified',
            'flagged' => 'Flagged',
            'rejected' => 'Rejected',
        ];

        $dtrStatusBreakdown = collect($dtrStatusLabels)
            ->map(fn ($label, $status): array => [
                'status' => $status,
                'label' => $label,
                'count' => (int) ($dtrStatusCounts[$status] ?? 0),
            ])
            ->values()
            ->all();

        $dtrTrend = PhotoDtr::query()
            ->when($filterYearId, fn ($query) => $query->whereHas('intern', fn ($q) => $q->where('academic_year_id', $filterYearId)))
            ->whereBetween('dtr_date', [$trendStart->toDateString(), $now->toDateString()])
            ->selectRaw('dtr_date, count(*) as total')
            ->groupBy('dtr_date')
            ->pluck('total', 'dtr_date');

        $journalTrend = DailyJournal::query()
            ->when($filterYearId, fn ($query) => $query->whereHas('intern', fn ($q) => $q->where('academic_year_id', $filterYearId)))
            ->whereBetween('date', [$trendStart->toDateString(), $now->toDateString()])
            ->selectRaw('date, count(*) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('total', 'date');

        $attendanceTrend = collect(range(0, $days - 1))->map(function (int $offset) use ($now, $days, $dtrTrend, $journalTrend): array {
            $day = $now->copy()->subDays($days - 1 - $offset)->toDateString();

            return [
                'date' => $day,
                'label' => Carbon::parse($day)->format('M d'),
                'dtr' => (int) ($dtrTrend[$day] ?? 0),
                'journals' => (int) ($journalTrend[$day] ?? 0),
            ];
        })->values()->all();

        $previousYearId = null;
        if ($filterYearId) {
            $currentYear = AcademicTerm::find($filterYearId);
            if ($currentYear) {
                $prev = AcademicTerm::where('id', '!=', $currentYear->id)->orderByDesc('start_at')->orderByDesc('id')->first();
                $previousYearId = $prev?->id;
            }
        } elseif ($activeTerm) {
            $prev = AcademicTerm::where('id', '!=', $activeTerm->id)->orderByDesc('start_at')->orderByDesc('id')->first();
            $previousYearId = $prev?->id;
        }

        $calcTrend = function (int $current, int $previous): array {
            if ($previous === 0) {
                return [
                    'percent' => $current > 0 ? 100.0 : 0.0,
                    'direction' => $current > 0 ? 'up' : 'neutral',
                ];
            }
            $p = (($current - $previous) / $previous) * 100;
            $direction = $p > 0.05 ? 'up' : ($p < -0.05 ? 'down' : 'neutral');

            return ['percent' => round($p, 1), 'direction' => $direction];
        };

        $currentTotalInterns = Intern::query()->when($filterYearId, fn ($q) => $q->where('academic_year_id', $filterYearId))->count();
        $previousTotalInterns = $previousYearId ? Intern::where('academic_year_id', $previousYearId)->count() : 0;
        $currentPendingRegistrations = (int) ($internStatusCounts['pending'] ?? 0);
        $previousPendingRegistrations = $previousYearId ? Intern::where('academic_year_id', $previousYearId)->where('status', 'pending')->count() : 0;
        $currentHtes = User::where('role', 'hte')->count();
        $previousHtesWindowStart = $trendStart->copy()->subDays($days);
        $previousHtesWindowEnd = $trendStart->copy()->subDay()->endOfDay();
        $currentHteNew = Hte::whereBetween('created_at', [$trendStart, $now])->count();
        $previousHteNew = Hte::whereBetween('created_at', [$previousHtesWindowStart, $previousHtesWindowEnd])->count();
        $currentPendingDtr = (int) ($dtrStatusCounts['pending'] ?? 0);
        $previousPendingDtr = $previousYearId ? PhotoDtr::whereHas('intern', fn ($q) => $q->where('academic_year_id', $previousYearId))->where('status', 'pending')->count() : 0;
        $currentUnresolvedIssues = Issue::query()->when($filterYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'pending')->count();
        $previousUnresolvedIssues = $previousYearId ? Issue::whereHas('intern', fn ($q) => $q->where('academic_year_id', $previousYearId))->where('status', 'pending')->count() : 0;
        $currentUnverified = User::whereNull('email_verified_at')->count();
        $previousUnverifiedWindowStart = $trendStart->copy()->subDays($days);
        $previousUnverified = User::whereNull('email_verified_at')->whereBetween('created_at', [$previousUnverifiedWindowStart, $previousHtesWindowEnd])->count();
        $currentUnverifiedWindow = User::whereNull('email_verified_at')->whereBetween('created_at', [$trendStart, $now])->count();
        $unverifiedTrendBaseCurrent = $currentUnverifiedWindow;
        $unverifiedTrendBasePrevious = $previousUnverified;

        $kpiTrends = [
            'total_interns' => $calcTrend($currentTotalInterns, $previousTotalInterns),
            'pending_registrations' => $calcTrend($currentPendingRegistrations, $previousPendingRegistrations),
            'hte_partners' => $calcTrend($currentHteNew, $previousHteNew),
            'pending_dtr_reviews' => $calcTrend($currentPendingDtr, $previousPendingDtr),
            'unresolved_issues' => $calcTrend($currentUnresolvedIssues, $previousUnresolvedIssues),
            'unverified_emails' => $calcTrend($unverifiedTrendBaseCurrent, $unverifiedTrendBasePrevious),
        ];

        return [
            'role' => 'admin',
            'stats' => [
                'total_users' => User::count(),
                'admins' => User::where('role', 'admin')->count(),
                'interns' => User::where('role', 'intern')->count(),
                'ojt_instructors' => User::where('role', 'ojt_instructor')->count(),
                'ojt_coordinators' => User::where('role', 'ojt_coordinator')->count(),
                'htes' => User::where('role', 'hte')->count(),
                'unverified_users' => User::whereNull('email_verified_at')->count(),
                'institutes' => Institute::count(),
                'programs' => Program::count(),
                'academic_terms' => AcademicTerm::count(),
            ],
            'role_breakdown' => [
                ['role' => 'intern', 'label' => 'Interns', 'count' => User::where('role', 'intern')->count()],
                ['role' => 'hte', 'label' => 'Host Training Establishment', 'count' => User::where('role', 'hte')->count()],
                ['role' => 'ojt_coordinator', 'label' => 'Coordinators', 'count' => User::where('role', 'ojt_coordinator')->count()],
                ['role' => 'ojt_instructor', 'label' => 'Instructors', 'count' => User::where('role', 'ojt_instructor')->count()],
                ['role' => 'admin', 'label' => 'Admins', 'count' => User::where('role', 'admin')->count()],
            ],
            'recent_interns' => $this->internRows(5),
            'recent_htes' => $this->hteRows(5),
            'active_academic_year' => $activeTerm ? [
                'id' => $activeTerm->id,
                'code' => $activeTerm->code,
                'description' => $activeTerm->description,
            ] : null,
            'intern_status_breakdown' => $internStatusBreakdown,
            'pending_registrations' => (int) ($internStatusCounts['pending'] ?? 0),
            'approved_interns' => (int) ($internStatusCounts['approved'] ?? 0),
            'rejected_interns' => (int) ($internStatusCounts['rejected'] ?? 0),
            'filters' => [
                'academic_year_id' => $filterYearId,
                'days' => $days,
            ],
            'filtered_interns_total' => Intern::query()->when($filterYearId, fn ($query) => $query->where('academic_year_id', $filterYearId))->count(),
            'kpi_trends' => $kpiTrends,
            'interns_by_institute' => Institute::query()
                ->withCount(['interns' => function ($query) use ($filterYearId): void {
                    $query->whereHas('user', fn ($userQuery) => $userQuery->where('role', 'intern'));
                    if ($filterYearId) {
                        $query->where('academic_year_id', $filterYearId);
                    }
                }])
                ->orderByDesc('interns_count')
                ->get()
                ->map(fn (Institute $institute): array => [
                    'name' => $institute->name,
                    'count' => (int) $institute->interns_count,
                ])
                ->values()
                ->all(),
            'top_programs' => Program::query()
                ->withCount(['interns' => function ($query) use ($filterYearId): void {
                    $query->whereHas('user', fn ($userQuery) => $userQuery->where('role', 'intern'));
                    if ($filterYearId) {
                        $query->where('academic_year_id', $filterYearId);
                    }
                }])
                ->orderByDesc('interns_count')
                ->get()
                ->map(fn (Program $program): array => [
                    'name' => $program->name,
                    'count' => (int) $program->interns_count,
                ])
                ->values()
                ->all(),
            'dtr_status_breakdown' => $dtrStatusBreakdown,
            'pending_dtr_reviews' => (int) ($dtrStatusCounts['pending'] ?? 0),
            'attendance_trend' => $attendanceTrend,
            'requirement_submissions' => [
                'total' => RequirementSubmission::query()->when($filterYearId, fn ($q) => $q->whereHas('user.intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->count(),
                'pending' => RequirementSubmission::query()->when($filterYearId, fn ($q) => $q->whereHas('user.intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'pending')->count(),
                'approved' => RequirementSubmission::query()->when($filterYearId, fn ($q) => $q->whereHas('user.intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'approved')->count(),
                'rejected' => RequirementSubmission::query()->when($filterYearId, fn ($q) => $q->whereHas('user.intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'rejected')->count(),
            ],
            'issues' => [
                'pending' => Issue::query()->when($filterYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'pending')->count(),
                'resolved' => Issue::query()->when($filterYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'resolve')->count(),
            ],
            'recent_issues' => Issue::query()
                ->when($filterYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))
                ->with(['intern.user', 'hte'])
                ->latest()
                ->limit(6)
                ->get()
                ->map(fn (Issue $issue): array => [
                    'id' => $issue->id,
                    'type' => $issue->type,
                    'status' => $issue->status,
                    'excerpt' => Str::limit($issue->issues, 80),
                    'raised_by' => $issue->type === 'hte'
                        ? ($issue->hte?->name ?? 'HTE')
                        : ($issue->intern?->user?->full_name ?? 'Intern'),
                    'created_at' => $issue->created_at,
                ])
                ->values()
                ->all(),
            'evaluations' => [
                'intern_ratings' => InternEvaluation::query()->when($filterYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->count(),
                'hte_ratings' => HteEvaluation::query()->when($filterYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->count(),
                'interns_evaluated_by_hte' => HteEvaluation::query()->when($filterYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->distinct('intern_id')->count('intern_id'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function coordinatorDashboard(Request $request): array
    {
        $coordinator = $request->user()->coordinator;
        $instituteId = $coordinator?->institute_id;
        $institute = $coordinator?->institute;

        if (! $instituteId) {
            return [
                'role' => 'ojt_coordinator',
                'institute' => null,
                'stats' => [
                    'interns' => User::where('role', 'intern')->count(),
                    'verified_interns' => User::where('role', 'intern')->whereNotNull('email_verified_at')->count(),
                    'htes' => User::where('role', 'hte')->count(),
                    'programs' => Program::count(),
                    'pending_registrations' => 0,
                    'approved_interns' => 0,
                    'rejected_interns' => 0,
                    'assigned_interns' => 0,
                    'unassigned_interns' => 0,
                    'htes_active' => Hte::where('status', 'active')->count(),
                ],
                'recent_interns' => $this->internRows(5),
                'htes' => $this->hteRows(10),
                'pending_approvals' => [],
                'intern_status_breakdown' => [],
                'ojt_status_breakdown' => [],
                'interns_by_program' => [],
                'requirement_submissions' => ['total' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0],
                'issues' => ['pending' => 0, 'resolved' => 0],
                'recent_issues' => [],
                'attendance_trend' => [],
                'dtr_status_breakdown' => [],
                'top_htes' => [],
                'filters' => ['academic_year_id' => null, 'days' => 30],
                'evaluations' => ['intern_ratings' => 0, 'hte_ratings' => 0, 'interns_evaluated_by_hte' => 0],
                'active_academic_year' => null,
                'filtered_interns_total' => User::where('role', 'intern')->count(),
            ];
        }

        $requestedDays = (int) $request->integer('days');
        $allowedDays = [7, 15, 30, 60, 90];
        $days = in_array($requestedDays, $allowedDays, true) ? $requestedDays : 30;

        $activeTerm = AcademicTerm::where('status', 'active')->latest('start_at')->first();

        $filterYearId = null;
        if ($request->filled('academic_year_id')) {
            $candidate = (int) $request->input('academic_year_id');
            if ($candidate > 0) {
                $filterYearId = $candidate;
            }
        } else {
            $filterYearId = $activeTerm?->id;
        }

        $now = now();
        $trendStart = $now->copy()->subDays($days - 1)->startOfDay();

        $internBase = Intern::where('institute_id', $instituteId)
            ->when($filterYearId, fn ($q) => $q->where('academic_year_id', $filterYearId));

        $internStatusCounts = (clone $internBase)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $internStatusLabels = [
            'pending' => 'Pending',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
        ];

        $internStatusBreakdown = collect($internStatusLabels)
            ->map(fn ($label, $status): array => [
                'status' => $status,
                'label' => $label,
                'count' => (int) ($internStatusCounts[$status] ?? 0),
            ])->values()->all();

        $ojtStatusCounts = (clone $internBase)
            ->selectRaw('ojt_status, count(*) as total')
            ->groupBy('ojt_status')
            ->pluck('total', 'ojt_status');

        $ojtStatusLabels = [
            'pending' => 'Not deployed',
            'ongoing' => 'Ongoing',
            'hours_completed' => 'Hours completed',
            'completed' => 'Completed',
        ];

        $ojtStatusBreakdown = collect($ojtStatusLabels)
            ->map(fn ($label, $status): array => [
                'status' => $status,
                'label' => $label,
                'count' => (int) ($ojtStatusCounts[$status] ?? 0),
            ])->values()->all();

        $dtrStatusCounts = PhotoDtr::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)
            ->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $dtrStatusLabels = [
            'pending' => 'Pending',
            'checked' => 'Checked',
            'verified' => 'Verified',
            'flagged' => 'Flagged',
            'rejected' => 'Rejected',
        ];

        $dtrStatusBreakdown = collect($dtrStatusLabels)
            ->map(fn ($label, $status): array => [
                'status' => $status,
                'label' => $label,
                'count' => (int) ($dtrStatusCounts[$status] ?? 0),
            ])->values()->all();

        $dtrTrend = PhotoDtr::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)
            ->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))
            ->whereBetween('dtr_date', [$trendStart->toDateString(), $now->toDateString()])
            ->selectRaw('dtr_date, count(*) as total')
            ->groupBy('dtr_date')
            ->pluck('total', 'dtr_date');

        $journalTrend = DailyJournal::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)
            ->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))
            ->whereBetween('date', [$trendStart->toDateString(), $now->toDateString()])
            ->selectRaw('date, count(*) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('total', 'date');

        $attendanceTrend = collect(range(0, $days - 1))->map(function (int $offset) use ($now, $days, $dtrTrend, $journalTrend): array {
            $day = $now->copy()->subDays($days - 1 - $offset)->toDateString();

            return [
                'date' => $day,
                'label' => Carbon::parse($day)->format('M d'),
                'dtr' => (int) ($dtrTrend[$day] ?? 0),
                'journals' => (int) ($journalTrend[$day] ?? 0),
            ];
        })->values()->all();

        $internsByProgram = Program::where('institute_id', $instituteId)
            ->withCount(['interns' => function ($query) use ($instituteId, $filterYearId): void {
                $query->where('institute_id', $instituteId);
                if ($filterYearId) {
                    $query->where('academic_year_id', $filterYearId);
                }
            }])
            ->orderByDesc('interns_count')
            ->get()
            ->map(fn (Program $program): array => [
                'name' => $program->name,
                'count' => (int) $program->interns_count,
            ])->values()->all();

        $requirementSubmissions = [
            'total' => RequirementSubmission::whereHas('user.intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->count(),
            'pending' => RequirementSubmission::whereHas('user.intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'pending')->count(),
            'approved' => RequirementSubmission::whereHas('user.intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'approved')->count(),
            'rejected' => RequirementSubmission::whereHas('user.intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'rejected')->count(),
        ];

        $issuesPending = Issue::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'pending')->count();
        $issuesResolved = Issue::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->where('status', 'resolve')->count();

        $recentIssues = Issue::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))
            ->with(['intern.user', 'hte'])
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Issue $issue): array => [
                'id' => $issue->id,
                'type' => $issue->type,
                'status' => $issue->status,
                'excerpt' => Str::limit($issue->issues, 80),
                'raised_by' => $issue->type === 'hte' ? ($issue->hte?->name ?? 'HTE') : ($issue->intern?->user?->full_name ?? 'Intern'),
                'intern_name' => $issue->intern?->user?->full_name,
                'hte_name' => $issue->hte?->name,
                'created_at' => $issue->created_at,
            ])->values()->all();

        $totalInterns = (clone $internBase)->count();
        $pendingCount = (int) ($internStatusCounts['pending'] ?? 0);
        $approvedCount = (int) ($internStatusCounts['approved'] ?? 0);
        $rejectedCount = (int) ($internStatusCounts['rejected'] ?? 0);
        $assignedCount = (clone $internBase)->whereNotNull('assigned_hte')->count();
        $unassignedCount = $totalInterns - $assignedCount;

        $verifiedInterns = User::where('role', 'intern')->whereNotNull('email_verified_at')
            ->whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->count();

        $htesTotal = Hte::where('institute_id', $instituteId)->count();
        $htesActive = Hte::where('institute_id', $instituteId)->where('status', 'active')->count();
        $programsCount = Program::where('institute_id', $instituteId)->count();

        $recentInterns = User::where('role', 'intern')
            ->whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))
            ->with('intern.program')
            ->latest()
            ->limit(5)
            ->get()
            ->map(function (User $user): array {
                // Resolved once: activeEnrollment() is a fresh query every call,
                // so reading it per field would triple the query count per row.
                $intern = $user->activeEnrollment();

                return [
                    'uuid' => $user->uuid,
                    'full_name' => trim(implode(' ', array_filter([$user->firstname, $user->middlename, $user->lastname, $user->extension]))),
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at,
                    'program' => $intern?->program?->name,
                    'status' => $intern?->status,
                    'ojt_status' => $intern?->ojt_status,
                    'created_at' => $user->created_at,
                ];
            })->values()->all();

        $htes = Hte::where('institute_id', $instituteId)
            ->with(['user', 'institute', 'program'])
            ->withCount('assignedInterns')
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (Hte $hte): array => [
                'uuid' => $hte->user->uuid,
                'name' => $hte->name,
                'status' => $hte->status,
                'institute' => $hte->institute?->name,
                'program' => $hte->program?->name,
                'assigned_count' => (int) $hte->assigned_interns_count,
            ])->values()->all();

        $topHtes = Hte::where('institute_id', $instituteId)
            ->withCount(['assignedInterns' => function ($q) use ($filterYearId): void {
                if ($filterYearId) {
                    $q->where('academic_year_id', $filterYearId);
                }
            }])
            ->orderByDesc('assigned_interns_count')
            ->limit(5)
            ->get()
            ->map(fn (Hte $hte): array => [
                'name' => $hte->name,
                'count' => (int) $hte->assigned_interns_count,
                'status' => $hte->status,
            ])->values()->all();

        $evaluations = [
            'intern_ratings' => InternEvaluation::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->count(),
            'hte_ratings' => HteEvaluation::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->count(),
            'interns_evaluated_by_hte' => HteEvaluation::whereHas('intern', fn ($q) => $q->where('institute_id', $instituteId)->when($filterYearId, fn ($qq) => $qq->where('academic_year_id', $filterYearId)))->distinct('intern_id')->count('intern_id'),
        ];

        return [
            'role' => 'ojt_coordinator',
            'institute' => $institute ? ['id' => $institute->id, 'name' => $institute->name] : null,
            'filters' => ['academic_year_id' => $filterYearId, 'days' => $days],
            'stats' => [
                'interns' => $totalInterns,
                'verified_interns' => $verifiedInterns,
                'htes' => $htesTotal,
                'htes_active' => $htesActive,
                'programs' => $programsCount,
                'pending_registrations' => $pendingCount,
                'approved_interns' => $approvedCount,
                'rejected_interns' => $rejectedCount,
                'assigned_interns' => $assignedCount,
                'unassigned_interns' => $unassignedCount,
                'pending' => $pendingCount,
                'total_interns' => $totalInterns,
            ],
            'recent_interns' => $recentInterns,
            'htes' => $htes,
            'pending_approvals' => $this->pendingApprovalRows(),
            'intern_status_breakdown' => $internStatusBreakdown,
            'ojt_status_breakdown' => $ojtStatusBreakdown,
            'dtr_status_breakdown' => $dtrStatusBreakdown,
            'interns_by_program' => $internsByProgram,
            'requirement_submissions' => $requirementSubmissions,
            'issues' => ['pending' => $issuesPending, 'resolved' => $issuesResolved],
            'recent_issues' => $recentIssues,
            'attendance_trend' => $attendanceTrend,
            'top_htes' => $topHtes,
            'evaluations' => $evaluations,
            'active_academic_year' => $activeTerm ? ['id' => $activeTerm->id, 'code' => $activeTerm->code, 'description' => $activeTerm->description] : null,
            'filtered_interns_total' => $totalInterns,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function instructorDashboard(Request $request): array
    {
        $academicYearId = $request->integer('academic_year_id');
        $activeTerm = AcademicTerm::where('status', 'active')
            ->latest('start_at')
            ->first();
        $targetYearId = $academicYearId ?: ($activeTerm?->id);

        $now = now();
        $days = 30;
        $trendStart = $now->copy()->subDays($days - 1)->startOfDay();

        $internStatusCounts = Intern::query()
            ->when($targetYearId, fn ($q) => $q->where('academic_year_id', $targetYearId))
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $internStatusLabels = [
            'pending' => 'Pending',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
        ];

        $internStatusBreakdown = collect($internStatusLabels)
            ->map(fn ($label, $status): array => [
                'status' => $status,
                'label' => $label,
                'count' => (int) ($internStatusCounts[$status] ?? 0),
            ])
            ->values()
            ->all();

        $ojtStatusCounts = Intern::query()
            ->when($targetYearId, fn ($q) => $q->where('academic_year_id', $targetYearId))
            ->selectRaw('ojt_status, count(*) as total')
            ->groupBy('ojt_status')
            ->pluck('total', 'ojt_status');

        $ojtStatusLabels = [
            'pending' => 'Not deployed',
            'ongoing' => 'Ongoing',
            'hours_completed' => 'Hours completed',
            'completed' => 'Completed',
        ];

        $ojtStatusBreakdown = collect($ojtStatusLabels)
            ->map(fn ($label, $status): array => [
                'status' => $status,
                'label' => $label,
                'count' => (int) ($ojtStatusCounts[$status] ?? 0),
            ])
            ->values()
            ->all();

        $dtrStatusCounts = PhotoDtr::query()
            ->when($targetYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $dtrStatusLabels = [
            'pending' => 'Pending',
            'checked' => 'Checked',
            'verified' => 'Verified',
            'flagged' => 'Flagged',
            'rejected' => 'Rejected',
        ];

        $dtrStatusBreakdown = collect($dtrStatusLabels)
            ->map(fn ($label, $status): array => [
                'status' => $status,
                'label' => $label,
                'count' => (int) ($dtrStatusCounts[$status] ?? 0),
            ])
            ->values()
            ->all();

        $dtrTrend = PhotoDtr::query()
            ->when($targetYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
            ->whereBetween('dtr_date', [$trendStart->toDateString(), $now->toDateString()])
            ->selectRaw('dtr_date, count(*) as total')
            ->groupBy('dtr_date')
            ->pluck('total', 'dtr_date');

        $journalTrend = DailyJournal::query()
            ->when($targetYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))
            ->whereBetween('date', [$trendStart->toDateString(), $now->toDateString()])
            ->selectRaw('date, count(*) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->pluck('total', 'date');

        $attendanceTrend = collect(range(0, $days - 1))->map(function (int $offset) use ($now, $days, $dtrTrend, $journalTrend): array {
            $day = $now->copy()->subDays($days - 1 - $offset)->toDateString();

            return [
                'date' => $day,
                'label' => Carbon::parse($day)->format('M d'),
                'dtr' => (int) ($dtrTrend[$day] ?? 0),
                'journals' => (int) ($journalTrend[$day] ?? 0),
            ];
        })->values()->all();

        $topPrograms = Program::query()
            ->withCount(['interns' => fn ($query) => $query->whereHas('user', fn ($userQuery) => $userQuery->where('role', 'intern'))->when($targetYearId, fn ($q) => $q->where('academic_year_id', $targetYearId))])
            ->orderByDesc('interns_count')
            ->get()
            ->map(fn (Program $program): array => [
                'name' => $program->name,
                'count' => (int) $program->interns_count,
            ])
            ->values()
            ->all();

        $requirementSubmissions = [
            'total' => RequirementSubmission::query()->when($targetYearId, fn ($q) => $q->whereHas('user.intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))->count(),
            'pending' => RequirementSubmission::query()->when($targetYearId, fn ($q) => $q->whereHas('user.intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))->where('status', 'pending')->count(),
            'approved' => RequirementSubmission::query()->when($targetYearId, fn ($q) => $q->whereHas('user.intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))->where('status', 'approved')->count(),
            'rejected' => RequirementSubmission::query()->when($targetYearId, fn ($q) => $q->whereHas('user.intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))->where('status', 'rejected')->count(),
        ];

        $issuesPending = Issue::query()->when($targetYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))->where('status', 'pending')->count();
        $issuesResolved = Issue::query()->when($targetYearId, fn ($q) => $q->whereHas('intern', fn ($qq) => $qq->where('academic_year_id', $targetYearId)))->where('status', 'resolve')->count();

        $recentIssues = Issue::query()
            ->with(['intern.user', 'hte'])
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Issue $issue): array => [
                'id' => $issue->id,
                'type' => $issue->type,
                'status' => $issue->status,
                'excerpt' => Str::limit($issue->issues, 80),
                'raised_by' => $issue->type === 'hte'
                    ? ($issue->hte?->name ?? 'HTE')
                    : ($issue->intern?->user?->full_name ?? 'Intern'),
                'created_at' => $issue->created_at,
            ])
            ->values()
            ->all();

        $evaluations = [
            'intern_ratings' => InternEvaluation::count(),
            'hte_ratings' => HteEvaluation::count(),
            'interns_evaluated_by_hte' => HteEvaluation::distinct('intern_id')->count('intern_id'),
        ];

        $totalInterns = User::where('role', 'intern')->count();
        $verifiedInterns = User::where('role', 'intern')->whereNotNull('email_verified_at')->count();
        $pendingCount = (int) ($internStatusCounts['pending'] ?? 0);
        $approvedCount = (int) ($internStatusCounts['approved'] ?? 0);
        $rejectedCount = (int) ($internStatusCounts['rejected'] ?? 0);
        $pendingDtr = (int) ($dtrStatusCounts['pending'] ?? 0);

        $previousYearId = null;
        if ($activeTerm) {
            $prev = AcademicTerm::where('id', '!=', $activeTerm->id)->orderByDesc('start_at')->orderByDesc('id')->first();
            $previousYearId = $prev?->id;
        }

        $calcTrend = function (int $current, int $previous): array {
            if ($previous === 0) {
                return [
                    'percent' => $current > 0 ? 100.0 : 0.0,
                    'direction' => $current > 0 ? 'up' : 'neutral',
                ];
            }
            $p = (($current - $previous) / $previous) * 100;
            $direction = $p > 0.05 ? 'up' : ($p < -0.05 ? 'down' : 'neutral');

            return ['percent' => round($p, 1), 'direction' => $direction];
        };

        $currentTotalInterns = $totalInterns;
        $previousTotalInterns = $previousYearId ? Intern::where('academic_year_id', $previousYearId)->count() : 0;
        $currentPendingRegistrations = $pendingCount;
        $previousPendingRegistrations = $previousYearId ? Intern::where('academic_year_id', $previousYearId)->where('status', 'pending')->count() : 0;
        $currentHtes = User::where('role', 'hte')->count();
        $previousHtesWindowStart = $trendStart->copy()->subDays($days);
        $previousHtesWindowEnd = $trendStart->copy()->subDay()->endOfDay();
        $currentHteNew = Hte::whereBetween('created_at', [$trendStart, $now])->count();
        $previousHteNew = Hte::whereBetween('created_at', [$previousHtesWindowStart, $previousHtesWindowEnd])->count();
        $currentPendingDtr = $pendingDtr;
        $previousPendingDtr = $previousYearId ? PhotoDtr::whereHas('intern', fn ($q) => $q->where('academic_year_id', $previousYearId))->where('status', 'pending')->count() : 0;
        $currentUnresolvedIssues = $issuesPending;
        $previousUnresolvedIssues = $previousYearId ? Issue::whereHas('intern', fn ($q) => $q->where('academic_year_id', $previousYearId))->where('status', 'pending')->count() : 0;
        $currentUnverified = User::whereNull('email_verified_at')->count();
        $previousUnverified = User::whereNull('email_verified_at')->whereBetween('created_at', [$previousHtesWindowStart, $previousHtesWindowEnd])->count();

        $kpiTrends = [
            'total_interns' => $calcTrend($currentTotalInterns, $previousTotalInterns),
            'pending_registrations' => $calcTrend($currentPendingRegistrations, $previousPendingRegistrations),
            'hte_partners' => $calcTrend($currentHteNew, $previousHteNew),
            'pending_dtr_reviews' => $calcTrend($currentPendingDtr, $previousPendingDtr),
            'unresolved_issues' => $calcTrend($currentUnresolvedIssues, $previousUnresolvedIssues),
            'unverified_emails' => $calcTrend($currentUnverified, $previousUnverified),
        ];

        return [
            'role' => 'ojt_instructor',
            'stats' => [
                'interns' => $totalInterns,
                'verified_interns' => $verifiedInterns,
                'htes' => $currentHtes,
                'programs' => Program::count(),
                'pending_registrations' => $pendingCount,
                'approved_interns' => $approvedCount,
                'rejected_interns' => $rejectedCount,
                'pending_dtr_reviews' => $pendingDtr,
                'unresolved_issues' => $issuesPending,
                'unverified_users' => $currentUnverified,
            ],
            'programs' => Program::withCount(['interns' => fn ($query) => $query->whereHas('user', fn ($userQuery) => $userQuery->where('role', 'intern'))])
                ->orderByDesc('interns_count')
                ->limit(8)
                ->get()
                ->map(fn (Program $program) => [
                    'name' => $program->name,
                    'intern_count' => $program->interns_count,
                ])
                ->values()
                ->all(),
            'recent_interns' => $this->internRows(5),
            'filters' => ['academic_year_id' => $activeTerm?->id, 'days' => $days],
            'active_academic_year' => $activeTerm ? [
                'id' => $activeTerm->id,
                'code' => $activeTerm->code,
                'description' => $activeTerm->description,
            ] : null,
            'kpi_trends' => $kpiTrends,
            'intern_status_breakdown' => $internStatusBreakdown,
            'ojt_status_breakdown' => $ojtStatusBreakdown,
            'dtr_status_breakdown' => $dtrStatusBreakdown,
            'pending_registrations' => $pendingCount,
            'approved_interns' => $approvedCount,
            'rejected_interns' => $rejectedCount,
            'filtered_interns_total' => $totalInterns,
            'top_programs' => $topPrograms,
            'attendance_trend' => $attendanceTrend,
            'pending_dtr_reviews' => $pendingDtr,
            'requirement_submissions' => $requirementSubmissions,
            'issues' => ['pending' => $issuesPending, 'resolved' => $issuesResolved],
            'recent_issues' => $recentIssues,
            'evaluations' => $evaluations,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function pendingApprovalRows(): array
    {
        $instituteId = request()->user()->coordinator?->institute_id;

        if (! $instituteId) {
            return [];
        }

        return Intern::where('institute_id', $instituteId)
            ->where('status', 'pending')
            ->with(['user', 'program'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (Intern $intern): array => [
                'uuid' => $intern->user->uuid,
                'full_name' => $intern->user->full_name,
                'email' => $intern->user->email,
                'program' => $intern->program?->name,
                'created_at' => $intern->created_at,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function internDashboard(Request $request): array
    {
        $user = $request->user();

        // The academic year filter was previously accepted and then ignored, so every
        // figure below came from the newest term no matter what was selected.
        $filterYearId = $request->integer('academic_year_id') ?: null;
        $filterYearId = $this->resolveInternDashboardTerm($user, $filterYearId);
        $intern = $user->enrollmentFor($filterYearId);

        if (! $intern) {
            return [
                'role' => 'intern',
                'user' => new UserResource($user),
                'intern' => null,
                // Must still carry the full term list. Returning an empty array here
                // emptied the dropdown the moment an unheld term was selected, which
                // broke the very empty state meant to explain the selection.
                'enrolled_terms' => $this->internTerms($user),
                'viewing_academic_year_id' => $filterYearId,
                'final_result' => $this->internFinalResult($user, $filterYearId),
                'incomplete_term' => null,
                'pending_application' => $this->pendingApplicationFor($user, $filterYearId),
                'rejected_application' => $this->latestRejectedApplication($user),
                'recent_dtr' => [],
                'recent_journals' => [],
                // `required` stays null when the intern has not declared hours on an OJT enrollment
                // for this term, which the dashboard surfaces as "apply to enrol" rather
                // than as a zero-hour target.
                'ojt_hours' => ['required' => null, 'earned' => 0, 'earned_minutes' => 0, 'remaining' => 0, 'progress' => 0],
                'requirements' => ['total' => 0, 'approved' => 0, 'pending' => 0, 'rejected' => 0],
                'issues' => ['pending' => 0, 'resolved' => 0],
            ];
        }

        $requiredHours = $intern->requiredHours();
        $earnedMinutes = $intern->earnedMinutes();
        $earnedHours = (int) floor($earnedMinutes / 60);
        $remainingMinutes = max(0, ($requiredHours ?? 0) * 60 - $earnedMinutes);
        $remainingHours = (int) floor($remainingMinutes / 60);
        $hoursProgress = $requiredHours > 0 ? min(100, round(($earnedMinutes / ($requiredHours * 60)) * 100)) : 0;

        $recentDtr = PhotoDtr::where('intern_id', $intern->id)
            ->latest('dtr_date')
            ->limit(5)
            ->get()
            ->map(fn (PhotoDtr $dtr): array => [
                'id' => $dtr->id,
                'date' => $dtr->dtr_date,
                'am_in' => $dtr->am_in_time,
                'am_out' => $dtr->am_out_time,
                'pm_in' => $dtr->pm_in_time,
                'pm_out' => $dtr->pm_out_time,
                'status' => $dtr->status,
                'created_at' => $dtr->created_at,
            ])
            ->values()
            ->all();

        $recentJournals = DailyJournal::where('intern_id', $intern->id)
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (DailyJournal $journal): array => [
                'id' => $journal->id,
                'date' => $journal->date,
                'title' => $journal->title,
                'excerpt' => Str::limit($journal->body ?? '', 80),
                'created_at' => $journal->created_at,
            ])
            ->values()
            ->all();

        // Scoped by intern_id, not user_id: a re-enrolled intern holds one submission row
        // per term, so counting by user mixed every term's requirements together.
        $requirementsTotal = RequirementSubmission::where('intern_id', $intern->id)->count();
        $requirementsApproved = RequirementSubmission::where('intern_id', $intern->id)->where('status', 'approved')->count();
        $requirementsPending = RequirementSubmission::where('intern_id', $intern->id)->where('status', 'pending')->count();
        $requirementsRejected = RequirementSubmission::where('intern_id', $intern->id)->where('status', 'rejected')->count();

        $issuesPending = Issue::where('intern_id', $intern->id)->where('status', 'pending')->count();
        $issuesResolved = Issue::where('intern_id', $intern->id)->where('status', 'resolve')->count();

        return [
            'role' => 'intern',
            'user' => new UserResource($user),
            'intern' => [
                'institute' => $intern->institute?->name,
                'program' => $intern->program?->name,
                'academic_year' => $intern->academicYear?->code,
                'academic_year_id' => $intern->academic_year_id,
                'practicum_instructor' => $intern->practicum_instructor,
                'date_of_birth' => $intern->date_of_birth,
                'status' => $intern->status,
                'rejection_reason' => $intern->rejection_reason,
                'reviewed_at' => $intern->reviewed_at,
                'grade' => $intern->grade,
                'ojt_status' => $intern->ojt_status,
            ],
            // Every academic term on record, newest first, so the intern can browse any
            // term and see which ones they hold. `is_enrolled` drives the markers in
            // the dropdown; picking a term they never held returns an empty dashboard
            // rather than an error. The held ids are resolved in one query so this map
            // stays a single query rather than one per term.
            'enrolled_terms' => $this->internTerms($user),
            // The term actually being served. The frontend needs this because the
            // resolved default can be a term the intern holds no enrollment row for
            // yet (a pending application), which its own fallback would skip past.
            'viewing_academic_year_id' => $filterYearId,

            // Terminal result for the term being viewed, so the banner always
            // describes what the intern is looking at.
            'final_result' => $this->internFinalResult($user, $filterYearId),
            'incomplete_term' => $this->internIncompleteTerm($intern),
            'pending_application' => $this->pendingApplicationFor($user, $filterYearId),
            'rejected_application' => $this->latestRejectedApplication($user),
            'ojt_hours' => [
                'required' => $requiredHours,
                'earned' => $earnedHours,
                'earned_minutes' => $earnedMinutes,
                'remaining' => $remainingHours,
                'progress' => $hoursProgress,
            ],
            'recent_dtr' => $recentDtr,
            'recent_journals' => $recentJournals,
            'requirements' => [
                'total' => $requirementsTotal,
                'approved' => $requirementsApproved,
                'pending' => $requirementsPending,
                'rejected' => $requirementsRejected,
            ],
            'issues' => [
                'pending' => $issuesPending,
                'resolved' => $issuesResolved,
            ],
        ];
    }

    /**
     * Every academic term, newest first, each flagged with whether this intern holds it.
     *
     * Returned on every dashboard response including the empty one, so the academic
     * year dropdown never disappears when a term without records is selected.
     *
     * @return array<int, array<string, mixed>>
     */
    private function internTerms(User $user): array
    {
        $held = $user->internEnrollments()->pluck('academic_year_id')->all();

        return AcademicTerm::query()
            ->orderByDesc('start_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (AcademicTerm $term): array => [
                'id' => $term->id,
                'description' => $term->description,
                'code' => $term->code,
                'status' => $term->status,
                'is_enrolled' => in_array($term->id, $held, true),
            ])
            ->values()
            ->all();
    }

    /**
     * The intern's latest rejected enrollment application, if any.
     *
     * This is an action item rather than a per-term statistic, so it follows the newest
     * application regardless of the selected academic year. An older rejection is hidden
     * once a newer application exists.
     *
     * @return array<string, mixed>|null
     */
    private function latestRejectedApplication(User $user): ?array
    {
        $application = OjtEnrollment::with('academicYear')
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->first();

        if (! $application || $application->status !== 'rejected') {
            return null;
        }

        return [
            'id' => $application->id,
            'academic_year_id' => $application->academic_year_id,
            'academic_year' => $application->academicYear?->description,
            'status' => $application->status,
            'rejection_reason' => $application->rejection_reason,
            'reviewed_at' => $application->reviewed_at?->toDateString(),
        ];
    }

    /**
     * The intern's terminal OJT outcome, resolved across every term they hold.
     *
     * A pass is what matters most, so a Passed anywhere wins. A failure only surfaces
     * while it is the most recent graded term — once they have enrolled in a later term
     * the old failure is history and should stop being announced.
     *
     * The grade alone decides whether there is a result — `ojt_status` is deliberately
     * not required. The hours workflow (pending → ongoing → hours_completed → completed)
     * is tracked separately, and an instructor may record the terminal grade before it
     * is closed. Gating on both hid a real Failed grade from an intern whose term was
     * still `ongoing`. The hour requirement is already advisory at the point of grading.
     *
     * Scoped to the selected term when one is given, so the banner describes the term
     * the intern is actually looking at rather than a different one. Pinning a term
     * also disables the "moved on" suppression below — an explicit request to see a
     * term should return that term's result, even if it is an old failure.
     *
     * A failure is also suppressed when the intern has already been approved to enrol
     * for that same term again, since the banner's advice no longer applies.
     *
     * @return array<string, mixed>|null
     */
    private function internFinalResult(User $user, ?int $academicYearId = null): ?array
    {
        $graded = $user->internEnrollments()
            ->whereNotNull('grade')
            ->when($academicYearId, fn (Builder $q) => $q->where('academic_year_id', $academicYearId))
            ->reorder('academic_year_id', 'desc')
            ->get();

        if ($graded->isEmpty()) {
            return null;
        }

        $passed = $graded->firstWhere('grade', 'Passed');

        if ($passed) {
            return [
                'outcome' => 'passed',
                'academic_year' => $passed->academicYear?->description,
                'grade' => $passed->grade,
                // Compared against the *active* enrollment, not the newest graded
                // one: someone who passed term 1 and then enrolled in term 2 is
                // congratulated, but not as if term 2 were the one they passed.
                // A pinned term is always "the one being looked at".
                'is_latest' => $academicYearId !== null || $passed->id === $user->activeEnrollment()?->id,
            ];
        }

        $latest = $graded->first();

        // The failure is stale once the intern has an enrollment application for the
        // failed term or for any later term (the active academic year included) —
        // whatever that application's status is. A pending, approved or rejected
        // application already explains where the intern stands, so telling them to
        // "apply again in a later term" would be misleading.
        $hasApplicationFromFailureTermOn = OjtEnrollment::where('user_id', $user->id)
            ->where('academic_year_id', '>=', $latest->academic_year_id)
            ->exists();

        if ($hasApplicationFromFailureTermOn) {
            return null;
        }

        // A newer ungraded enrollment supersedes the failure — the intern has moved on,
        // so the old failure is history and should stop being announced. Not applied
        // when a term is pinned, since the intern explicitly asked to see it.
        if (! $academicYearId && $latest->id !== $user->activeEnrollment()?->id) {
            return null;
        }

        return [
            'outcome' => 'failed',
            'academic_year' => $latest->academicYear?->description,
            'grade' => $latest->grade,
            'is_latest' => true,
        ];
    }

    /**
     * Which academic year the dashboard should show when the intern has not chosen one.
     *
     * A pending application is the intern's live situation — they are waiting on a
     * coordinator for that term, normally the active academic year — so the dashboard
     * opens on it rather than on a term they have already finished. Without this the
     * page landed on the newest *held* enrollment, which for an intern re-enrolling is
     * their previous term.
     *
     * An explicit selection from the dropdown always wins.
     */
    private function resolveInternDashboardTerm(User $user, ?int $requestedYearId): ?int
    {
        if ($requestedYearId) {
            return $requestedYearId;
        }

        $pendingYearId = OjtEnrollment::where('user_id', $user->id)
            ->where('status', 'pending')
            ->orderByDesc('academic_year_id')
            ->value('academic_year_id');

        return $pendingYearId ? (int) $pendingYearId : null;
    }

    /**
     * The intern's pending application, for the term being viewed.
     *
     * A pending application has no enrollment row yet — approval is what creates one —
     * so the dashboard would otherwise open on this term and render nothing at all.
     * Reporting it here is what makes the pending state legible.
     *
     * @return array<string, mixed>|null
     */
    private function pendingApplicationFor(User $user, ?int $academicYearId): ?array
    {
        $application = OjtEnrollment::where('user_id', $user->id)
            ->where('status', 'pending')
            ->when($academicYearId, fn (Builder $q) => $q->where('academic_year_id', $academicYearId))
            ->orderByDesc('academic_year_id')
            ->first();

        if (! $application) {
            return null;
        }

        return [
            'ojt_enrollment_id' => $application->id,
            'academic_year_id' => $application->academic_year_id,
            'academic_year' => $application->academicYear?->description,
            'submitted_at' => $application->created_at,
        ];
    }

    /**
     * A term that closed while the intern was still short of completing it.
     *
     * Distinct from a failure: no grade was ever recorded, so the intern did not do
     * anything wrong — the term simply ended with the OJT unfinished. Reported only
     * for the term being viewed, matching `internFinalResult()`, so it always
     * describes what the intern is looking at.
     *
     * @return array<string, mixed>|null
     */
    private function internIncompleteTerm(?Intern $intern): ?array
    {
        if (! $intern) {
            return null;
        }

        // Completed OJT is finished by definition.
        if ($intern->ojt_status === 'completed') {
            return null;
        }

        // A recorded grade is a terminal result and is reported by internFinalResult()
        // instead. 'Pending' is accepted defensively; the column is nullable and only
        // holds Passed/Failed.
        if ($intern->grade !== null && $intern->grade !== 'Pending') {
            return null;
        }

        $term = $intern->academicYear;

        // Still-running terms are simply in progress, not abandoned.
        if (! $term || $term->status === 'active') {
            return null;
        }

        return [
            'academic_year' => $term->description,
            'academic_year_id' => $term->id,
            'ojt_status' => $intern->ojt_status,
            'grade' => $intern->grade,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function hteDashboard(Request $request): array
    {
        $user = $request->user();
        $hte = $user->hte;

        return [
            'role' => 'hte',
            'user' => new UserResource($user),
            'hte' => $hte ? [
                'name' => $hte->name,
                'institute' => $hte->institute?->name,
                'program' => $hte->program?->name,
                'status' => $hte->status,
                'start_at' => $hte->start_at,
                'end_at' => $hte->end_at,
                'has_moa' => (bool) $hte->moa,
            ] : null,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function internRows(int $limit): array
    {
        return User::where('role', 'intern')
            ->with('intern.program')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(function (User $user): array {
                return [
                    'uuid' => $user->uuid,
                    'full_name' => trim(implode(' ', array_filter([
                        $user->firstname,
                        $user->middlename,
                        $user->lastname,
                        $user->extension,
                    ]))),
                    'email' => $user->email,
                    'email_verified_at' => $user->email_verified_at,
                    'program' => $user->activeEnrollment()?->program?->name,
                    'created_at' => $user->created_at,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function hteRows(int $limit): array
    {
        return Hte::with('user', 'institute', 'program')
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (Hte $hte): array => [
                'uuid' => $hte->user->uuid,
                'name' => $hte->name,
                'status' => $hte->status,
                'institute' => $hte->institute?->name,
                'program' => $hte->program?->name,
            ])
            ->values()
            ->all();
    }
}
