<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\DocumentResource;
use App\Http\Resources\Admin\EnrollmentDocumentResource;
use App\Models\OjtEnrollment;
use App\Models\OjtEnrollmentDocument;
use App\Models\RequirementSubmission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

/**
 * Admin document archive. Two sources share this controller:
 *
 * - `requirements` (default): approved requirement submissions, each filed
 *   under the placement it was submitted to, so a transferred intern's files
 *   stay attributable to the right host.
 * - `enrollment`: COR / curriculum attachments of approved OJT enrollment
 *   applications — the documents every intern hands in to enroll.
 */
class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return $request->string('source')->trim()->toString() === 'enrollment'
            ? $this->enrollmentIndex($request)
            : $this->requirementIndex($request);
    }

    public function download(Request $request): BinaryFileResponse|JsonResponse
    {
        return $request->string('source')->trim()->toString() === 'enrollment'
            ? $this->enrollmentDownload($request)
            : $this->requirementDownload($request);
    }

    private function requirementIndex(Request $request): JsonResponse
    {
        $query = $this->filteredQuery($request);

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'created_at', 'reviewed_at'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $submissions = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => DocumentResource::collection($submissions),
            'meta' => [
                'current_page' => $submissions->currentPage(),
                'last_page' => $submissions->lastPage(),
                'per_page' => $submissions->perPage(),
                'total' => $submissions->total(),
                'from' => $submissions->firstItem(),
                'to' => $submissions->lastItem(),
            ],
        ]);
    }

    /**
     * One row per document attached to an approved enrollment application.
     */
    private function enrollmentIndex(Request $request): JsonResponse
    {
        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'created_at'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $documents = $this->enrollmentFilteredQuery($request)
            ->orderBy($sort, $order)
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => EnrollmentDocumentResource::collection($documents),
            'meta' => [
                'current_page' => $documents->currentPage(),
                'last_page' => $documents->lastPage(),
                'per_page' => $documents->perPage(),
                'total' => $documents->total(),
                'from' => $documents->firstItem(),
                'to' => $documents->lastItem(),
            ],
        ]);
    }

    private function requirementDownload(Request $request): BinaryFileResponse|JsonResponse
    {
        $submissions = $this->filteredQuery($request)
            ->with(['user.intern.institute', 'user.intern.academicYear', 'requirement'])
            ->orderBy('id', 'asc')
            ->get();

        if ($submissions->isEmpty()) {
            return response()->json([
                'message' => 'No approved documents match the selected filters.',
                'errors' => ['documents' => ['No files to download. Adjust your filters and try again.']],
            ], 422);
        }

        $valid = $submissions->filter(fn (RequirementSubmission $s): bool => $s->file_path && Storage::disk('public')->exists($s->file_path));

        if ($valid->isEmpty()) {
            return response()->json([
                'message' => 'No files found on storage for the selected filters.',
                'errors' => ['documents' => ['All matched files are missing from storage.']],
            ], 422);
        }

        $entries = [];
        $usedNames = [];

        foreach ($valid as $submission) {
            $user = $submission->user;
            $intern = $user?->intern;
            $requirement = $submission->requirement;

            $internName = $user?->full_name ?? 'unknown';
            $reqName = $requirement?->name ?? 'requirement';

            $ext = pathinfo((string) $submission->file_path, PATHINFO_EXTENSION);
            $ext = $ext !== '' ? '.'.$ext : '';

            $academicYear = $intern?->academicYear?->description ?? 'no-year';
            $instituteName = $intern?->institute?->name ?? $requirement?->institute?->name ?? 'no-institute';

            $folder = Str::slug($academicYear, '_').'/'.Str::slug($instituteName, '_').'/'.Str::slug($reqName, '_');
            $name = Str::slug($reqName.'_'.$internName, '_');

            $entries[] = [
                'source' => Storage::disk('public')->path($submission->file_path),
                'entry' => $this->uniqueEntry($folder, $name, $ext, $usedNames),
            ];
        }

        return $this->zipResponse($entries);
    }

    /**
     * Everything attached to approved enrollment applications, filed under
     * `academic year/institute/enrollment_documents`.
     */
    private function enrollmentDownload(Request $request): BinaryFileResponse|JsonResponse
    {
        $documents = $this->enrollmentFilteredQuery($request)
            ->orderBy('id', 'asc')
            ->get();

        if ($documents->isEmpty()) {
            return response()->json([
                'message' => 'No approved enrollment documents match the selected filters.',
                'errors' => ['documents' => ['No files to download. Adjust your filters and try again.']],
            ], 422);
        }

        $valid = $documents->filter(fn (OjtEnrollmentDocument $document): bool => $document->file_path && Storage::disk('public')->exists($document->file_path));

        if ($valid->isEmpty()) {
            return response()->json([
                'message' => 'No files found on storage for the selected filters.',
                'errors' => ['documents' => ['All matched files are missing from storage.']],
            ], 422);
        }

        $entries = [];
        $usedNames = [];

        foreach ($valid as $document) {
            $enrollment = $document->enrollment;
            $user = $enrollment?->user;

            $internName = $user?->full_name ?? 'unknown';
            $label = OjtEnrollment::REQUIRED_ITEMS[$document->type] ?? ($document->label ?: 'Other');

            $ext = pathinfo((string) $document->file_path, PATHINFO_EXTENSION);
            $ext = $ext !== '' ? '.'.$ext : '';

            $academicYear = $enrollment?->academicYear?->description ?? 'no-year';
            $instituteName = $enrollment?->institute?->name ?? 'no-institute';

            $folder = Str::slug($academicYear, '_').'/'.Str::slug($instituteName, '_').'/enrollment_documents';
            $name = Str::slug($label.'_'.$internName, '_');

            $entries[] = [
                'source' => Storage::disk('public')->path($document->file_path),
                'entry' => $this->uniqueEntry($folder, $name, $ext, $usedNames),
            ];
        }

        return $this->zipResponse($entries);
    }

    private function filteredQuery(Request $request): Builder
    {
        $query = RequirementSubmission::query()
            ->with(['user.intern.institute', 'user.intern.academicYear', 'user.intern.program', 'requirement.institute', 'user', 'reviewer', 'placement.hte'])
            ->where('status', 'approved')
            ->whereHas('user.intern', function (Builder $builder): void {
                $builder->where('status', 'approved');
            });

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->whereHas('user', function (Builder $b) use ($search): void {
                    $b->where('firstname', 'like', "%{$search}%")
                        ->orWhere('middlename', 'like', "%{$search}%")
                        ->orWhere('lastname', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })->orWhereHas('requirement', function (Builder $b) use ($search): void {
                    $b->where('name', 'like', "%{$search}%");
                });
            });
        }

        $academicYearId = $request->integer('academic_year_id');

        if ($academicYearId > 0) {
            $query->whereHas('user.intern', function (Builder $builder) use ($academicYearId): void {
                $builder->where('academic_year_id', $academicYearId);
            });
        }

        $instituteId = $request->integer('institute_id');

        if ($instituteId > 0) {
            $query->whereHas('user.intern', function (Builder $builder) use ($instituteId): void {
                $builder->where('institute_id', $instituteId);
            });
        }

        $requirementId = $request->integer('requirement_id');

        if ($requirementId > 0) {
            $query->where('requirement_id', $requirementId);
        }

        $requirementIds = $request->input('requirement_ids');

        if (is_string($requirementIds) && $requirementIds !== '') {
            $requirementIds = explode(',', $requirementIds);
        }

        if (is_array($requirementIds) && count($requirementIds) > 0) {
            $ids = collect($requirementIds)
                ->map(fn ($value): int => (int) $value)
                ->filter(fn (int $value): bool => $value > 0)
                ->values()
                ->all();

            if (count($ids) > 0) {
                $query->whereIn('requirement_id', $ids);
            }
        }

        return $query;
    }

    private function enrollmentFilteredQuery(Request $request): Builder
    {
        $query = OjtEnrollmentDocument::query()
            ->with(['enrollment.user', 'enrollment.academicYear', 'enrollment.institute', 'enrollment.program'])
            ->whereHas('enrollment', function (Builder $builder): void {
                $builder->where('status', 'approved');
            });

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->whereHas('enrollment.user', function (Builder $builder) use ($search): void {
                $builder->where('firstname', 'like', "%{$search}%")
                    ->orWhere('middlename', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $academicYearId = $request->integer('academic_year_id');

        if ($academicYearId > 0) {
            $query->whereHas('enrollment', function (Builder $builder) use ($academicYearId): void {
                $builder->where('academic_year_id', $academicYearId);
            });
        }

        $instituteId = $request->integer('institute_id');

        if ($instituteId > 0) {
            $query->whereHas('enrollment', function (Builder $builder) use ($instituteId): void {
                $builder->where('institute_id', $instituteId);
            });
        }

        return $query;
    }

    /**
     * A collision-free name inside the ZIP, appending `_1`, `_2`, ... when the
     * same folder already holds a file with that name.
     *
     * @param  array<string, bool>  $usedNames
     */
    private function uniqueEntry(string $folder, string $name, string $ext, array &$usedNames): string
    {
        $entry = $folder.'/'.$name.$ext;

        $counter = 1;
        $uniqueEntry = $entry;

        while (isset($usedNames[$uniqueEntry])) {
            $uniqueEntry = $folder.'/'.Str::slug($name.'_'.$counter, '_').$ext;
            $counter++;
        }

        $usedNames[$uniqueEntry] = true;

        return $uniqueEntry;
    }

    /**
     * @param  array<int, array{source: string, entry: string}>  $entries  absolute path, name inside the ZIP
     */
    private function zipResponse(array $entries): BinaryFileResponse|JsonResponse
    {
        $zipName = 'documents_'.now()->format('Y-m-d_His').'_'.Str::random(6).'.zip';
        $zipPath = storage_path('app/private/'.$zipName);

        if (! is_dir(dirname($zipPath))) {
            mkdir(dirname($zipPath), 0755, true);
        }

        $zip = new ZipArchive;

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return response()->json([
                'message' => 'Failed to create ZIP archive.',
            ], 500);
        }

        foreach ($entries as $entry) {
            $zip->addFile($entry['source'], $entry['entry']);
        }

        $zip->close();

        return response()->download($zipPath, 'smartlog_documents_'.now()->format('Y-m-d').'.zip')->deleteFileAfterSend(true);
    }
}
