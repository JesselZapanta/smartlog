<?php

namespace App\Http\Controllers\Api\Hte;

use App\Http\Controllers\Controller;
use App\Models\Intern;
use App\Models\Issue;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IssueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $hte = $request->user()->hte;

        if (! $hte) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => 10,
                    'total' => 0,
                    'from' => null,
                    'to' => null,
                ],
            ]);
        }

        $query = Issue::with(['intern.user', 'intern.academicYear', 'intern.institute', 'hte.user'])
            ->where('hte_id', $hte->id)
            ->where('type', 'hte');

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('issues', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%")
                    ->orWhereHas('intern.user', function (Builder $b) use ($search): void {
                        $b->where('firstname', 'like', "%{$search}%")
                            ->orWhere('middlename', 'like', "%{$search}%")
                            ->orWhere('lastname', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $academicYearId = $request->integer('academic_year_id');

        if ($academicYearId > 0) {
            $query->whereHas('intern', function (Builder $builder) use ($academicYearId): void {
                $builder->where('academic_year_id', $academicYearId);
            });
        }

        $status = $request->string('status')->trim()->toString();

        if (in_array($status, ['pending', 'resolve'], true)) {
            $query->where('status', $status);
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'created_at'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $issues = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $issues->through(function (Issue $issue): array {
                $internUser = $issue->intern?->user;

                return [
                    'id' => $issue->id,
                    'intern_id' => $issue->intern_id,
                    'hte_id' => $issue->hte_id,
                    'intern_name' => $internUser?->full_name ?? '—',
                    'intern_email' => $internUser?->email ?? '—',
                    'intern_uuid' => $internUser?->uuid ?? null,
                    'academic_year' => $issue->intern?->academicYear?->description ?? '—',
                    'academic_year_id' => $issue->intern?->academic_year_id,
                    'type' => $issue->type,
                    'issues' => $issue->issues,
                    'solutions' => $issue->solutions,
                    'recommendations' => $issue->recommendations,
                    'status' => $issue->status,
                    'created_at' => $issue->created_at,
                    'updated_at' => $issue->updated_at,
                ];
            })->items(),
            'meta' => [
                'current_page' => $issues->currentPage(),
                'last_page' => $issues->lastPage(),
                'per_page' => $issues->perPage(),
                'total' => $issues->total(),
                'from' => $issues->firstItem(),
                'to' => $issues->lastItem(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $hte = $request->user()->hte;

        if (! $hte) {
            abort(403, 'Your account is not linked to an HTE profile.');
        }

        $data = $request->validate([
            'intern_id' => ['required', 'integer', 'exists:interns,id'],
            'issues' => ['required', 'string', 'max:5000'],
            'solutions' => ['nullable', 'string', 'max:5000'],
            'recommendations' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', Rule::in(['pending', 'resolve'])],
        ]);

        $role = $request->user()->role;
        $type = in_array($role, ['hte', 'intern'], true) ? $role : 'hte';

        $intern = Intern::with('user')->find($data['intern_id']);

        if (! $intern || $intern->assigned_hte !== $hte->id) {
            return response()->json([
                'message' => 'The selected intern is not assigned to your establishment.',
                'errors' => ['intern_id' => ['The selected intern is not assigned to your establishment.']],
            ], 422);
        }

        $issue = Issue::create([
            'intern_id' => $intern->id,
            'hte_id' => $hte->id,
            'type' => $type,
            'issues' => $data['issues'],
            'solutions' => $data['solutions'] ?? null,
            'recommendations' => $data['recommendations'] ?? null,
            'status' => $data['status'] ?? 'pending',
        ]);

        UserNotification::notifyCoordinators(
            $intern->institute_id,
            'issue_reported',
            'New Issue Reported',
            $hte->name.' reported an issue for '.$intern->user->full_name.'.',
            ['issue_id' => $issue->id, 'intern_id' => $intern->id, 'hte_id' => $hte->id]
        );

        return response()->json([
            'data' => [
                'id' => $issue->id,
                'message' => 'Issue reported successfully.',
            ],
        ], 201);
    }

    public function assignableInterns(Request $request): JsonResponse
    {
        $hte = $request->user()->hte;

        if (! $hte) {
            return response()->json(['data' => []]);
        }

        $interns = Intern::with(['user', 'academicYear'])
            ->where('assigned_hte', $hte->id)
            ->whereIn('ojt_status', ['ongoing', 'hours_completed', 'completed'])
            ->orderBy('id', 'desc')
            ->get()
            ->map(function (Intern $intern): array {
                return [
                    'id' => $intern->id,
                    'uuid' => $intern->user?->uuid,
                    'full_name' => $intern->user?->full_name ?? '—',
                    'email' => $intern->user?->email ?? '—',
                    'academic_year' => $intern->academicYear?->description ?? '—',
                    'ojt_status' => $intern->ojt_status,
                ];
            });

        return response()->json(['data' => $interns]);
    }

    public function show(Request $request, Issue $issue): JsonResponse
    {
        $hte = $request->user()->hte;

        if (! $hte || $issue->hte_id !== $hte->id) {
            abort(403, 'This issue does not belong to your establishment.');
        }

        $issue->load(['intern.user', 'intern.academicYear', 'hte.user']);

        return response()->json([
            'data' => [
                'id' => $issue->id,
                'intern_id' => $issue->intern_id,
                'hte_id' => $issue->hte_id,
                'intern_name' => $issue->intern?->user?->full_name ?? '—',
                'intern_uuid' => $issue->intern?->user?->uuid,
                'hte_name' => $issue->hte?->name ?? '—',
                'academic_year' => $issue->intern?->academicYear?->description ?? '—',
                'type' => $issue->type,
                'issues' => $issue->issues,
                'solutions' => $issue->solutions,
                'recommendations' => $issue->recommendations,
                'status' => $issue->status,
                'created_at' => $issue->created_at,
                'updated_at' => $issue->updated_at,
            ],
        ]);
    }

    public function update(Request $request, Issue $issue): JsonResponse
    {
        $hte = $request->user()->hte;

        if (! $hte || $issue->hte_id !== $hte->id) {
            abort(403, 'This issue does not belong to your establishment.');
        }

        if ($issue->status === 'resolve') {
            return response()->json([
                'message' => 'Resolved issues cannot be edited.',
                'errors' => ['issues' => ['Resolved issues cannot be edited.']],
            ], 422);
        }

        $data = $request->validate([
            'intern_id' => ['required', 'integer', 'exists:interns,id'],
            'issues' => ['required', 'string', 'max:5000'],
        ]);

        $intern = Intern::with('user')->find($data['intern_id']);

        if (! $intern || $intern->assigned_hte !== $hte->id) {
            return response()->json([
                'message' => 'The selected intern is not assigned to your establishment.',
                'errors' => ['intern_id' => ['The selected intern is not assigned to your establishment.']],
            ], 422);
        }

        $issue->update([
            'intern_id' => $intern->id,
            'issues' => $data['issues'],
        ]);

        $issue->load(['intern.user', 'intern.academicYear', 'hte.user']);

        return response()->json([
            'data' => [
                'id' => $issue->id,
                'message' => 'Issue updated successfully.',
            ],
        ]);
    }

    public function destroy(Request $request, Issue $issue): JsonResponse
    {
        $hte = $request->user()->hte;

        if (! $hte || $issue->hte_id !== $hte->id) {
            abort(403, 'This issue does not belong to your establishment.');
        }

        $issue->delete();

        return response()->json([
            'data' => ['message' => 'Issue deleted successfully.'],
        ]);
    }
}
