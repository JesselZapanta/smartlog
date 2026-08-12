<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\AcademicTerm;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use App\Support\StorageUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => match ($user->role) {
                'admin' => $this->adminDashboard(),
                'ojt_coordinator' => $this->coordinatorDashboard(),
                'ojt_instructor' => $this->instructorDashboard(),
                'intern' => $this->internDashboard($user),
                'hte' => $this->hteDashboard($user),
                default => ['role' => $user->role],
            },
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function adminDashboard(): array
    {
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
                ['role' => 'hte', 'label' => 'Host Training Est.', 'count' => User::where('role', 'hte')->count()],
                ['role' => 'ojt_coordinator', 'label' => 'Coordinators', 'count' => User::where('role', 'ojt_coordinator')->count()],
                ['role' => 'ojt_instructor', 'label' => 'Instructors', 'count' => User::where('role', 'ojt_instructor')->count()],
                ['role' => 'admin', 'label' => 'Admins', 'count' => User::where('role', 'admin')->count()],
            ],
            'recent_interns' => $this->internRows(5),
            'recent_htes' => $this->hteRows(5),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function coordinatorDashboard(): array
    {
        return [
            'role' => 'ojt_coordinator',
            'stats' => [
                'interns' => User::where('role', 'intern')->count(),
                'verified_interns' => User::where('role', 'intern')->whereNotNull('email_verified_at')->count(),
                'htes' => User::where('role', 'hte')->count(),
                'programs' => Program::count(),
            ],
            'recent_interns' => $this->internRows(5),
            'htes' => $this->hteRows(10),
            'pending_approvals' => $this->pendingApprovalRows(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function instructorDashboard(): array
    {
        return [
            'role' => 'ojt_instructor',
            'stats' => [
                'interns' => User::where('role', 'intern')->count(),
                'verified_interns' => User::where('role', 'intern')->whereNotNull('email_verified_at')->count(),
                'htes' => User::where('role', 'hte')->count(),
                'programs' => Program::count(),
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
    private function internDashboard(User $user): array
    {
        $intern = $user->intern;

        return [
            'role' => 'intern',
            'user' => new UserResource($user),
            'intern' => $intern ? [
                'institute' => $intern->institute?->name,
                'program' => $intern->program?->name,
                'academic_year' => $intern->academicYear?->code,
                'practicum_instructor' => $intern->practicum_instructor,
                'date_of_birth' => $intern->date_of_birth,
                'status' => $intern->status,
                'rejection_reason' => $intern->rejection_reason,
                'reviewed_at' => $intern->reviewed_at,
                'cor' => StorageUrl::url($intern->cor_path),
            ] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function hteDashboard(User $user): array
    {
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
                    'program' => $user->intern?->program?->name,
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
