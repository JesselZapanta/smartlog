<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
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
        $intern = $request->user()->intern;

        if (! $intern) {
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

        $query = Issue::with(['intern.user', 'intern.academicYear', 'hte.user'])
            ->where('intern_id', $intern->id)
            ->where('type', 'intern');

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('issues', 'like', "%{$search}%")
                    ->orWhereHas('hte', function (Builder $b) use ($search): void {
                        $b->where('name', 'like', "%{$search}%");
                    });
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
                return [
                    'id' => $issue->id,
                    'intern_id' => $issue->intern_id,
                    'hte_id' => $issue->hte_id,
                    'hte_name' => $issue->hte?->name ?? '—',
                    'intern_name' => $issue->intern?->user?->full_name ?? '—',
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
        $intern = $request->user()->intern;

        if (! $intern) {
            abort(403, 'Your account is not linked to an intern profile.');
        }

        if (! $intern->assigned_hte) {
            return response()->json([
                'message' => 'You are not assigned to an HTE.',
                'errors' => ['intern_id' => ['You must be assigned to an HTE to report an issue.']],
            ], 422);
        }

        $data = $request->validate([
            'issues' => ['required', 'string', 'max:5000'],
            'solutions' => ['nullable', 'string', 'max:5000'],
            'recommendations' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', Rule::in(['pending', 'resolve'])],
        ]);

        $role = $request->user()->role;
        $type = in_array($role, ['hte', 'intern'], true) ? $role : 'intern';

        $issue = Issue::create([
            'intern_id' => $intern->id,
            'hte_id' => $intern->assigned_hte,
            'type' => $type,
            'issues' => $data['issues'],
            'solutions' => $data['solutions'] ?? null,
            'recommendations' => $data['recommendations'] ?? null,
            'status' => $data['status'] ?? 'pending',
        ]);

        $hte = $intern->assignedHte;

        UserNotification::notifyCoordinators(
            $intern->institute_id,
            'issue_reported',
            'New Issue Reported',
            $request->user()->full_name.' reported an issue'.($hte ? ' for '.$hte->name : '').'.',
            ['issue_id' => $issue->id, 'intern_id' => $intern->id, 'hte_id' => $intern->assigned_hte]
        );

        return response()->json([
            'data' => [
                'id' => $issue->id,
                'message' => 'Issue reported successfully.',
            ],
        ], 201);
    }

    public function show(Request $request, Issue $issue): JsonResponse
    {
        $intern = $request->user()->intern;

        if (! $intern || $issue->intern_id !== $intern->id) {
            abort(403, 'This issue does not belong to your account.');
        }

        $issue->load(['intern.user', 'hte.user']);

        return response()->json([
            'data' => [
                'id' => $issue->id,
                'intern_id' => $issue->intern_id,
                'hte_id' => $issue->hte_id,
                'hte_name' => $issue->hte?->name ?? '—',
                'intern_name' => $issue->intern?->user?->full_name ?? '—',
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
        $intern = $request->user()->intern;

        if (! $intern || $issue->intern_id !== $intern->id) {
            abort(403, 'This issue does not belong to your account.');
        }

        if ($issue->status === 'resolve') {
            return response()->json([
                'message' => 'Resolved issues cannot be edited.',
                'errors' => ['issues' => ['Resolved issues cannot be edited.']],
            ], 422);
        }

        $data = $request->validate([
            'issues' => ['required', 'string', 'max:5000'],
        ]);

        $issue->update([
            'issues' => $data['issues'],
        ]);

        $issue->load(['intern.user', 'hte.user']);

        return response()->json([
            'data' => [
                'id' => $issue->id,
                'message' => 'Issue updated successfully.',
            ],
        ]);
    }

    public function destroy(Request $request, Issue $issue): JsonResponse
    {
        $intern = $request->user()->intern;

        if (! $intern || $issue->intern_id !== $intern->id) {
            abort(403, 'This issue does not belong to your account.');
        }

        $issue->delete();

        return response()->json([
            'data' => ['message' => 'Issue deleted successfully.'],
        ]);
    }

    public function hteInfo(Request $request): JsonResponse
    {
        $intern = $request->user()->intern;

        if (! $intern || ! $intern->assigned_hte) {
            return response()->json(['data' => null]);
        }

        $hte = $intern->assignedHte;

        if (! $hte) {
            return response()->json(['data' => null]);
        }

        $hte->loadMissing(['user', 'institute', 'program']);

        return response()->json([
            'data' => [
                'id' => $hte->id,
                'name' => $hte->name,
                'status' => $hte->status,
                'institute' => $hte->institute?->name,
            ],
        ]);
    }
}
