<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Issues;

use App\Http\Controllers\Controller;
use App\Models\Intern;
use App\Models\Issue;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

abstract class BaseIssueController extends Controller
{
    /**
     * The issue type this controller is permanently scoped to.
     *
     * Each concern direction gets its own controller and its own set of routes,
     * so the type is derived from the URL rather than the request body and can
     * never be forged or crossed over by the client.
     */
    abstract protected function issueType(): string;

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
            ->where('type', $this->issueType())
            ->whereHas('intern', function (Builder $builder) use ($instituteId): void {
                $builder->where('institute_id', $instituteId);
            });

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('issues', 'like', "%{$search}%")
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
            'data' => $issues->through(fn (Issue $issue): array => $this->transform($issue))->items(),
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
        $instituteId = $this->requireInstitute($request);

        $data = $request->validate([
            'intern_id' => ['required', 'integer', 'exists:interns,id'],
            'issues' => ['required', 'string', 'max:5000'],
            'solutions' => ['nullable', 'string', 'max:5000'],
            'recommendations' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', Rule::in(['pending', 'resolve'])],
        ]);

        $intern = $this->validateIntern((int) $data['intern_id'], $instituteId);

        $issue = Issue::create([
            'intern_id' => $intern->id,
            'hte_id' => $intern->assigned_hte,
            'type' => $this->issueType(),
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
        $instituteId = $this->requireInstitute($request);

        $issue->load(['intern.user', 'intern.academicYear', 'hte.user']);

        $this->authorizeIssue($issue, $instituteId);

        return response()->json(['data' => $this->transform($issue)]);
    }

    public function update(Request $request, Issue $issue): JsonResponse
    {
        $instituteId = $this->requireInstitute($request);

        $issue->load(['intern']);

        $this->authorizeIssue($issue, $instituteId);

        // `issues` is deliberately absent: the concern text belongs to the reporter and is
        // never accepted from the coordinator, so it is ignored even if the client sends it.
        $data = $request->validate([
            'intern_id' => ['required', 'integer', 'exists:interns,id'],
            'solutions' => ['nullable', 'string', 'max:5000'],
            'recommendations' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', Rule::in(['pending', 'resolve'])],
        ]);

        $intern = $this->validateIntern((int) $data['intern_id'], $instituteId);

        $wasResolved = $issue->status === 'resolve';

        $issue->update([
            'intern_id' => $intern->id,
            'hte_id' => $intern->assigned_hte,
            'solutions' => $data['solutions'] ?? null,
            'recommendations' => $data['recommendations'] ?? null,
            'status' => $data['status'],
        ]);

        if ($data['status'] === 'resolve' && ! $wasResolved) {
            $this->notifyResolved($issue);
        }

        return response()->json([
            'data' => ['id' => $issue->id, 'message' => 'Issue updated successfully.'],
        ]);
    }

    public function destroy(Request $request, Issue $issue): JsonResponse
    {
        $instituteId = $this->requireInstitute($request);

        $issue->load(['intern']);

        $this->authorizeIssue($issue, $instituteId);

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

    protected function requireInstitute(Request $request): int
    {
        $instituteId = $request->user()->coordinator?->institute_id;

        abort_if(! $instituteId, 403, 'Your account is not assigned to an institute yet.');

        return $instituteId;
    }

    /**
     * Guard every single-record action against cross-institute access and
     * against reaching an issue that belongs to the other concern direction.
     */
    protected function authorizeIssue(Issue $issue, int $instituteId): void
    {
        abort_if($issue->type !== $this->issueType(), 404);

        abort_if($issue->intern?->institute_id !== $instituteId, 403, 'This issue does not belong to your institute.');
    }

    protected function validateIntern(int $internId, int $instituteId): Intern
    {
        $intern = Intern::with(['user', 'assignedHte'])->find($internId);

        if (! $intern || $intern->institute_id !== $instituteId) {
            abort(422, 'The selected intern does not belong to your institute.');
        }

        abort_if(! $intern->assigned_hte, 422, 'The selected intern is not assigned to an HTE.');

        return $intern;
    }

    protected function notifyResolved(Issue $issue): void
    {
        $issue->loadMissing(['intern.user', 'hte.user']);

        if ($issue->type === 'hte' && $issue->hte?->user) {
            UserNotification::notify(
                $issue->hte->user,
                'issue_resolved',
                'Issue Resolved',
                'Your concern for '.($issue->intern?->user?->full_name ?? 'the intern').' has been marked as resolved.',
                ['issue_id' => $issue->id, 'intern_id' => $issue->intern_id, 'hte_id' => $issue->hte_id, 'type' => $issue->type]
            );

            return;
        }

        if ($issue->type === 'intern' && $issue->intern?->user) {
            UserNotification::notify(
                $issue->intern->user,
                'issue_resolved',
                'Issue Resolved',
                'Your concern with '.($issue->hte?->name ?? 'the HTE').' has been marked as resolved.',
                ['issue_id' => $issue->id, 'intern_id' => $issue->intern_id, 'hte_id' => $issue->hte_id, 'type' => $issue->type]
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function transform(Issue $issue): array
    {
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
    }
}
