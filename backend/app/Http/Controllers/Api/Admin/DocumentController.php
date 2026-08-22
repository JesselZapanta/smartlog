<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\DocumentResource;
use App\Models\RequirementSubmission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
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

    public function download(Request $request): BinaryFileResponse|JsonResponse
    {
        $query = $this->filteredQuery($request);

        $submissions = $query
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
            $base = Str::slug($reqName.'_'.$internName, '_').$ext;

            $entry = $folder.'/'.$base;

            $counter = 1;
            $uniqueEntry = $entry;

            while (isset($usedNames[$uniqueEntry])) {
                $uniqueEntry = $folder.'/'.Str::slug($reqName.'_'.$internName.'_'.$counter, '_').$ext;
                $counter++;
            }

            $usedNames[$uniqueEntry] = true;

            $absolutePath = Storage::disk('public')->path($submission->file_path);
            $zip->addFile($absolutePath, $uniqueEntry);
        }

        $zip->close();

        return response()->download($zipPath, 'smartlog_documents_'.now()->format('Y-m-d').'.zip')->deleteFileAfterSend(true);
    }

    private function filteredQuery(Request $request): Builder
    {
        $query = RequirementSubmission::query()
            ->with(['user.intern.institute', 'user.intern.academicYear', 'user.intern.program', 'requirement.institute', 'user', 'reviewer'])
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
}
