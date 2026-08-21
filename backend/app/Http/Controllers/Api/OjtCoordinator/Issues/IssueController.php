<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Issues;

use App\Http\Controllers\Controller;
use App\Models\Intern;
use App\Models\Issue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class IssueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
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

        $query = Issue::with(['intern.user', 'intern.academicYear', 'hte.user', 'hte.institute'])
            ->whereHas('intern', function (Builder $builder) use ($instituteId): void {
                $builder->where('institute_id', $instituteId);
            });

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
                    })
                    ->orWhereHas('hte', function (Builder $b) use ($search): void {
                        $b->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $academicYearId = $request->integer('academic_year_id');

        if ($academicYearId > 0) {
            $query->whereHas('intern', function (Builder $builder) use ($academicYearId): void {
                $builder->where('academic_year_id', $academicYearId);
            });
        }

        $type = $request->string('type')->trim()->toString();

        if (in_array($type, ['intern', 'hte'], true)) {
            $query->where('type', $type);
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
                    'hte_name' => $issue->hte?->name ?? '—',
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
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $data = $request->validate([
            'intern_id' => ['required', 'integer', 'exists:interns,id'],
            'type' => ['required', Rule::in(['intern', 'hte'])],
            'issues' => ['required', 'string', 'max:5000'],
            'solutions' => ['nullable', 'string', 'max:5000'],
            'recommendations' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', Rule::in(['pending', 'resolve'])],
        ]);

        $intern = Intern::with(['user', 'assignedHte'])->find($data['intern_id']);

        if (! $intern || $intern->institute_id !== $instituteId) {
            return response()->json([
                'message' => 'The selected intern does not belong to your institute.',
                'errors' => ['intern_id' => ['The selected intern does not belong to your institute.']],
            ], 422);
        }

        if (! $intern->assigned_hte) {
            return response()->json([
                'message' => 'The selected intern is not assigned to an HTE.',
                'errors' => ['intern_id' => ['The selected intern is not assigned to an HTE.']],
            ], 422);
        }

        $issue = Issue::create([
            'intern_id' => $intern->id,
            'hte_id' => $intern->assigned_hte,
            'type' => $data['type'],
            'issues' => $data['issues'],
            'solutions' => $data['solutions'] ?? null,
            'recommendations' => $data['recommendations'] ?? null,
            'status' => $data['status'] ?? 'pending',
        ]);

        return response()->json([
            'data' => [
                'id' => $issue->id,
                'message' => 'Issue created successfully.',
            ],
        ], 201);
    }

    public function show(Request $request, Issue $issue): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $issue->load(['intern.user', 'intern.academicYear', 'hte.user']);

        if ($issue->intern?->institute_id !== $instituteId) {
            abort(403, 'This issue does not belong to your institute.');
        }

        return response()->json([
            'data' => [
                'id' => $issue->id,
                'intern_id' => $issue->intern_id,
                'hte_id' => $issue->hte_id,
                'intern_name' => $issue->intern?->user?->full_name ?? '—',
                'intern_email' => $issue->intern?->user?->email ?? '—',
                'intern_uuid' => $issue->intern?->user?->uuid,
                'hte_name' => $issue->hte?->name ?? '—',
                'academic_year' => $issue->intern?->academicYear?->description ?? '—',
                'academic_year_id' => $issue->intern?->academic_year_id,
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
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $issue->load(['intern']);

        if ($issue->intern?->institute_id !== $instituteId) {
            abort(403, 'This issue does not belong to your institute.');
        }

        $data = $request->validate([
            'intern_id' => ['required', 'integer', 'exists:interns,id'],
            'type' => ['required', Rule::in(['intern', 'hte'])],
            'issues' => ['required', 'string', 'max:5000'],
            'solutions' => ['nullable', 'string', 'max:5000'],
            'recommendations' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', Rule::in(['pending', 'resolve'])],
        ]);

        $intern = Intern::find($data['intern_id']);

        if (! $intern || $intern->institute_id !== $instituteId) {
            return response()->json([
                'message' => 'The selected intern does not belong to your institute.',
                'errors' => ['intern_id' => ['The selected intern does not belong to your institute.']],
            ], 422);
        }

        if (! $intern->assigned_hte) {
            return response()->json([
                'message' => 'The selected intern is not assigned to an HTE.',
                'errors' => ['intern_id' => ['The selected intern is not assigned to an HTE.']],
            ], 422);
        }

        $wasResolved = $issue->status === 'resolve';

        $issue->update([
            'intern_id' => $intern->id,
            'hte_id' => $intern->assigned_hte,
            'type' => $data['type'],
            'issues' => $data['issues'],
            'solutions' => $data['solutions'] ?? null,
            'recommendations' => $data['recommendations'] ?? null,
            'status' => $data['status'],
        ]);

        if ($data['status'] === 'resolve' && ! $wasResolved) {
            $issue->loadMissing(['intern.user', 'hte.user']);

            if ($issue->type === 'hte' && $issue->hte?->user) {
                UserNotification::notify(
                    $issue->hte->user,
                    'issue_resolved',
                    'Issue Resolved',
                    'Your concern for '.($issue->intern?->user?->full_name ?? 'the intern').' has been marked as resolved.',
                    ['issue_id' => $issue->id, 'intern_id' => $issue->intern_id, 'hte_id' => $issue->hte_id, 'type' => $issue->type]
                );
            } elseif ($issue->type === 'intern' && $issue->intern?->user) {
                UserNotification::notify(
                    $issue->intern->user,
                    'issue_resolved',
                    'Issue Resolved',
                    'Your concern with '.($issue->hte?->name ?? 'the HTE').' has been marked as resolved.',
                    ['issue_id' => $issue->id, 'intern_id' => $issue->intern_id, 'hte_id' => $issue->hte_id, 'type' => $issue->type]
                );
            }
        }

        return response()->json([
            'data' => ['id' => $issue->id, 'message' => 'Issue updated successfully.'],
        ]);
    }

    public function destroy(Request $request, Issue $issue): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $issue->load(['intern']);

        if ($issue->intern?->institute_id !== $instituteId) {
            abort(403, 'This issue does not belong to your institute.');
        }

        $issue->delete();

        return response()->json([
            'data' => ['message' => 'Issue deleted successfully.'],
        ]);
    }

    public function internOptions(Request $request): JsonResponse
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        if (! $instituteId) {
            return response()->json(['data' => []]);
        }

        $interns = Intern::with(['user', 'academicYear', 'assignedHte'])
            ->where('institute_id', $instituteId)
            ->whereNotNull('assigned_hte')
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
                    'assigned_hte' => $intern->assigned_hte,
                    'hte_name' => $intern->assignedHte?->name ?? '—',
                    'hte_id' => $intern->assignedHte?->id,
                ];
            });

        return response()->json(['data' => $interns]);
    }
}
