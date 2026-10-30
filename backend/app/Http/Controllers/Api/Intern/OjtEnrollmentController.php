<?php

namespace App\Http\Controllers\Api\Intern;

use App\Http\Controllers\Controller;
use App\Http\Requests\Intern\StoreOjtEnrollmentRequest;
use App\Http\Resources\OjtEnrollmentResource;
use App\Models\AcademicTerm;
use App\Models\OjtEnrollment;
use App\Models\OjtEnrollmentDocument;
use App\Models\User;
use App\Models\UserNotification;
use App\Support\StorageUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class OjtEnrollmentController extends Controller
{
    /**
     * Upper bound on a single declaration. Generous enough for any real programme while
     * stopping a stray paste from locking the application behind absurd figures.
     */
    private const MAX_OJT_HOURS = 10000;

    /**
     * Display labels for the documents every application must include.
     *
     * @var array<string, string>
     */
    private const REQUIRED_DOCUMENT_LABELS = [
        'cor' => 'New COR',
        'curriculum' => 'Curriculum',
    ];

    /**
     * Everything the intern needs to start an application: the terms still
     * open to them, and the programme/institute that will be carried over.
     */
    public function options(Request $request): JsonResponse
    {
        $user = $request->user();
        $previous = $user->activeEnrollment();
        $activeAcademicYear = AcademicTerm::where('status', 'active')->latest('start_at')->first();
        $activeAcademicYearData = $activeAcademicYear ? [
            'id' => $activeAcademicYear->id,
            'code' => $activeAcademicYear->code,
            'description' => $activeAcademicYear->description,
        ] : null;

        if (! $previous) {
            return response()->json([
                'data' => [
                    'can_enroll' => false,
                    'reason' => 'Register as an intern before applying to enrol for OJT.',
                    'current' => null,
                    'active_academic_year' => $activeAcademicYearData,
                    'terms' => [],
                ],
            ]);
        }

        $passed = $user->passedEnrollment();

        if ($passed) {
            return response()->json([
                'data' => [
                    'can_enroll' => false,
                    'reason' => 'You have already passed your OJT in '.$passed->academicYear?->description.' You cannot enrol for another term.',
                    'passed_term' => $passed->academicYear?->description,
                    'current' => [
                        'academic_year_id' => $previous->academic_year_id,
                        'academic_year' => $previous->academicYear?->description ?? '—',
                        'ojt_status' => $previous->ojt_status,
                        'grade' => $previous->grade,
                        'institute' => $previous->institute?->name ?? '—',
                        'program' => $previous->program?->name ?? '—',
                    ],
                    'active_academic_year' => $activeAcademicYearData,
                    'terms' => [],
                ],
            ]);
        }

        $enrolledTermIds = DB::table('interns')
            ->where('user_id', $user->id)
            ->pluck('academic_year_id')
            ->all();

        // A term that already carries a pending or approved application is closed: that
        // row can no longer be changed, so offering the term would only produce a
        // "already submitted" error. A rejected application is still editable, so its
        // term stays selectable and the intern can correct it and send it back.
        $lockedTermIds = OjtEnrollment::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->pluck('academic_year_id')
            ->all();

        $terms = AcademicTerm::whereNotIn('id', array_merge($enrolledTermIds, $lockedTermIds))
            ->orderByDesc('start_at')
            ->get(['id', 'code', 'description'])
            ->map(fn (AcademicTerm $term): array => [
                'id' => $term->id,
                'code' => $term->code,
                'description' => $term->description,
            ])
            ->values();

        return response()->json([
            'data' => [
                'can_enroll' => $terms->isNotEmpty(),
                'reason' => $terms->isEmpty() ? 'You already have an application for every available term.' : null,
                'current' => [
                    'academic_year_id' => $previous->academic_year_id,
                    'academic_year' => $previous->academicYear?->description ?? '—',
                    'ojt_status' => $previous->ojt_status,
                    'grade' => $previous->grade,
                    'institute' => $previous->institute?->name ?? '—',
                    'program' => $previous->program?->name ?? '—',
                ],
                'active_academic_year' => $activeAcademicYearData,
                'institute_id' => $previous->institute_id,
                'program_id' => $previous->program_id,
                'terms' => $terms,
                'required_items' => OjtEnrollment::REQUIRED_ITEMS,
                // Whether the intern's outstanding application is complete, so the page
                // can gate the submit button instead of failing on click.
                'application_complete' => $this->hasCompleteApplication($user),
            ],
        ]);
    }

    public function store(StoreOjtEnrollmentRequest $request): JsonResponse
    {
        $user = $request->user();
        $previous = $user->activeEnrollment();

        if (! $previous) {
            throw ValidationException::withMessages([
                'academic_year_id' => 'Register as an intern before applying to enrol for OJT.',
            ]);
        }

        // Passing is terminal. Checked here as well as in options() so the rule
        // holds even if the page is stale or the endpoint is called directly.
        if ($user->hasPassedOjt()) {
            throw ValidationException::withMessages([
                'academic_year_id' => 'You have already passed your OJT and cannot enrol for another term.',
            ]);
        }

        $termId = (int) $request->validated('academic_year_id');

        $alreadyEnrolled = DB::table('interns')
            ->where('user_id', $user->id)
            ->where('academic_year_id', $termId)
            ->exists();

        if ($alreadyEnrolled) {
            throw ValidationException::withMessages([
                'academic_year_id' => 'You are already enrolled for that term.',
            ]);
        }

        $existing = OjtEnrollment::where('user_id', $user->id)
            ->where('academic_year_id', $termId)
            ->first();

        if ($existing && ! $existing->isEditable()) {
            throw ValidationException::withMessages([
                'application' => 'This application has already been submitted for review and can no longer be changed.',
            ]);
        }

        // One row already exists for this term, so continue it instead of creating a
        // duplicate. Rejected applications may be corrected here before they return to
        // review; pending and approved applications are already locked above.
        if ($existing) {
            if ($request->filled('ojt_hours')) {
                $existing->update(['ojt_hours' => (int) $request->validated('ojt_hours')]);
            }

            foreach (['cor', 'curriculum'] as $documentType) {
                if ($request->hasFile($documentType)) {
                    $this->replaceApplicationDocument(
                        $existing,
                        $documentType,
                        $request->file($documentType)
                    );
                }
            }

            $submission = $existing->fresh()->load(['user', 'academicYear', 'institute', 'program', 'documents']);
            $this->assertRequiredItems($submission);

            $submission->update([
                'status' => 'pending',
                'rejection_reason' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
            ]);

            // The coordinator who rejected this needs to know it came back, otherwise the
            // correction sits unnoticed in a list they have already dealt with.
            $this->notifyCoordinatorsOfSubmission($submission, 'ojt_enrollment_resubmitted', 'OJT Enrolment Resubmitted');

            return response()->json([
                'data' => new OjtEnrollmentResource($submission->fresh()->load(['user', 'academicYear', 'institute', 'program', 'documents'])),
                'message' => 'Your application has been submitted for review.',
            ]);
        }

        // A new row is created only when the term, hours, and both required files are
        // supplied together. This keeps incomplete work out of review without needing a
        // separate draft state: there is simply no row until the submission is complete.
        $this->assertNewApplicationInputs($request);
        $storedPaths = [];

        try {
            $enrollment = DB::transaction(function () use ($user, $termId, $previous, $request, &$storedPaths) {
                $enrollment = OjtEnrollment::create([
                    'user_id' => $user->id,
                    'academic_year_id' => $termId,
                    'institute_id' => $previous->institute_id,
                    'program_id' => $previous->program_id,
                    'ojt_hours' => (int) $request->validated('ojt_hours'),
                    'status' => 'pending',
                ]);

                foreach (['cor', 'curriculum'] as $documentType) {
                    $document = $this->replaceApplicationDocument(
                        $enrollment,
                        $documentType,
                        $request->file($documentType)
                    );
                    $storedPaths[] = $document->file_path;
                }

                return $enrollment;
            });
        } catch (Throwable $throwable) {
            foreach ($storedPaths as $storedPath) {
                Storage::disk('public')->delete($storedPath);
            }

            throw $throwable;
        }

        // Notify only after the row is committed, so a rolled-back submission never
        // leaves a coordinator chasing an application that does not exist.
        $this->notifyCoordinatorsOfSubmission($enrollment, 'ojt_enrollment_submitted', 'OJT Enrolment Submitted');

        return response()->json([
            'data' => new OjtEnrollmentResource($enrollment->load(['user', 'academicYear', 'institute', 'program', 'documents'])),
            'message' => 'Your application to enrol for OJT was submitted.',
        ], 201);
    }

    /**
     * Tell the institute's coordinators that an enrollment application is waiting.
     *
     * The approval and rejection notifications already run in the opposite direction;
     * this closes the loop so a submission cannot sit unnoticed in the review list.
     */
    private function notifyCoordinatorsOfSubmission(OjtEnrollment $enrollment, string $type, string $title): void
    {
        $student = trim($enrollment->user?->full_name ?? '') ?: 'An intern';

        UserNotification::notifyCoordinators(
            (int) $enrollment->institute_id,
            $type,
            $title,
            $student.' applied to enrol for OJT in '.($enrollment->academicYear?->description ?? 'the upcoming term').'.',
            [
                'ojt_enrollment_id' => $enrollment->id,
                'uuid' => $enrollment->user?->uuid,
                'academic_year_id' => $enrollment->academic_year_id,
            ]
        );
    }

    /**
     * Require the complete submission for a new application. Supplied files and hours
     * have already passed Form Request validation; this only checks presence.
     */
    private function assertNewApplicationInputs(Request $request): void
    {
        $errors = [];

        if ($request->input('ojt_hours') === null || $request->input('ojt_hours') === '') {
            $errors['ojt_hours'] = 'Enter the number of OJT hours you have rendered.';
        }

        foreach (['cor' => 'New COR', 'curriculum' => 'Curriculum'] as $documentType => $label) {
            if (! $request->hasFile($documentType)) {
                $errors[$documentType] = "Upload your {$label} before submitting.";
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Declare the OJT hours the intern has already rendered.
     *
     * Hours are a number on the application, not an uploaded file, so they have their
     * own endpoint rather than sharing the document one.
     */
    public function storeOjtHours(Request $request, OjtEnrollment $ojtEnrollment): JsonResponse
    {
        $this->authorizeOwnership($request, $ojtEnrollment);
        $this->authorizeNotPassed($request);

        if (! $ojtEnrollment->isEditable()) {
            throw ValidationException::withMessages([
                'ojt_hours' => 'This application has already been submitted for review and can no longer be changed.',
            ]);
        }

        $data = $request->validate([
            'ojt_hours' => ['required', 'integer', 'min:1', 'max:'.self::MAX_OJT_HOURS],
        ], [
            'ojt_hours.required' => 'Enter the number of OJT hours you have rendered.',
            'ojt_hours.min' => 'Enter at least 1 hour.',
            'ojt_hours.max' => 'That figure looks too large. Enter the hours you have rendered.',
        ]);

        $ojtEnrollment->update(['ojt_hours' => (int) $data['ojt_hours']]);

        return response()->json([
            'data' => new OjtEnrollmentResource($ojtEnrollment->fresh()->load(['user', 'academicYear', 'institute', 'program', 'documents'])),
            'message' => 'OJT hours saved.',
        ]);
    }

    public function upload(Request $request, OjtEnrollment $ojtEnrollment): JsonResponse
    {
        $this->authorizeOwnership($request, $ojtEnrollment);
        $this->authorizeNotPassed($request);

        if (! $ojtEnrollment->isEditable()) {
            throw ValidationException::withMessages([
                'file' => 'This application has already been submitted for review and can no longer be changed.',
            ]);
        }

        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(OjtEnrollmentDocument::TYPES)],
            'label' => ['nullable', 'string', 'max:120'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ], [
            'type.in' => 'Unknown document type.',
            'file.mimes' => 'Upload a PDF, JPG, PNG or JPEG file.',
            'file.max' => 'The file may not be larger than 10 MB.',
        ]);

        $type = $data['type'];

        $document = $this->replaceApplicationDocument(
            $ojtEnrollment,
            $type,
            $request->file('file'),
            $data['label'] ?? null
        );

        return response()->json([
            'data' => [
                'id' => $document->id,
                'type' => $document->type,
                'label' => $document->label,
                'url' => StorageUrl::url($document->file_path),
            ],
            'message' => 'Document uploaded.',
        ], 201);
    }

    /**
     * Store one document of the given type, replacing any previous upload.
     */
    private function replaceApplicationDocument(
        OjtEnrollment $ojtEnrollment,
        string $type,
        UploadedFile $file,
        ?string $label = null
    ): OjtEnrollmentDocument {
        $existing = $ojtEnrollment->documents()->where('type', $type)->first();

        if ($existing) {
            Storage::disk('public')->delete($existing->file_path);
            $existing->delete();
        }

        $path = $file->store('ojt-enrollment-documents', 'public');

        return $ojtEnrollment->documents()->create([
            'type' => $type,
            'label' => $label ?? self::defaultLabelFor($type, $file),
            'file_path' => $path,
        ]);
    }

    /**
     * Human label for a required document when the intern does not supply one.
     */
    private static function defaultLabelFor(string $type, UploadedFile $file): string
    {
        return self::REQUIRED_DOCUMENT_LABELS[$type] ?? $file->getClientOriginalName();
    }

    public function destroyDocument(Request $request, OjtEnrollment $ojtEnrollment, OjtEnrollmentDocument $document): JsonResponse
    {
        $this->authorizeOwnership($request, $ojtEnrollment);
        $this->authorizeNotPassed($request);

        if (! $ojtEnrollment->isEditable()) {
            throw ValidationException::withMessages([
                'document' => 'This application has already been submitted for review and can no longer be changed.',
            ]);
        }

        if ($document->ojt_enrollment_id !== $ojtEnrollment->id) {
            abort(404);
        }

        Storage::disk('public')->delete($document->file_path);
        $document->delete();

        return response()->json([
            'data' => ['message' => 'Document removed.'],
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        $user = $request->user();

        $enrollment = OjtEnrollment::where('user_id', $user->id)
            ->orderByDesc('academic_year_id')
            ->first();

        $history = $user->internEnrollments()
            ->with(['academicYear', 'institute', 'program'])
            ->get()
            ->map(fn ($intern): array => [
                'intern_id' => $intern->id,
                'academic_year_id' => $intern->academic_year_id,
                'academic_year' => $intern->academicYear?->description ?? '—',
                'status' => $intern->status,
                'ojt_status' => $intern->ojt_status,
                'grade' => $intern->grade,
                'institute' => $intern->institute?->name ?? '—',
                'program' => $intern->program?->name ?? '—',
            ])
            ->values();

        return response()->json([
            'data' => [
                'application' => $enrollment
                    ? new OjtEnrollmentResource($enrollment->load(['user', 'academicYear', 'institute', 'program', 'documents']))
                    : null,
                'history' => $history,
            ],
        ]);
    }

    private function authorizeOwnership(Request $request, OjtEnrollment $enrollment): void
    {
        abort_if($enrollment->user_id !== $request->user()->id, 403, 'This application does not belong to you.');
    }

    /**
     * Every application must carry a new COR, a curriculum, and a declared hours
     * figure.
     *
     * Enforced on resubmission rather than at creation, so the intern can create the
     * application first and fill in the requirements — that is the only way documents
     * can be uploaded, since uploads hang off an existing application row.
     */
    private function assertRequiredItems(OjtEnrollment $enrollment): void
    {
        $missing = $enrollment->missingRequiredItems();

        if ($missing === []) {
            return;
        }

        throw ValidationException::withMessages([
            'requirements' => 'Complete the following before submitting: '.implode(', ', array_map(
                fn (string $key): string => OjtEnrollment::REQUIRED_ITEMS[$key],
                $missing
            )).'.',
        ]);
    }

    /**
     * Whether the intern's outstanding application already carries every required
     * document. True when there is no application yet, since a new one starts empty.
     */
    private function hasCompleteApplication(User $user): bool
    {
        $application = OjtEnrollment::where('user_id', $user->id)
            ->orderByDesc('academic_year_id')
            ->with('documents')
            ->first();

        if (! $application) {
            return true;
        }

        return $application->missingRequiredItems() === [];
    }

    /**
     * Passing is terminal, so no further enrolment work is accepted.
     *
     * An application submitted before the pass can never be approved, so uploading to
     * it or removing its documents would be pointless — the coordinator's approve()
     * refuses it for the same reason.
     */
    private function authorizeNotPassed(Request $request): void
    {
        if ($request->user()->hasPassedOjt()) {
            throw ValidationException::withMessages([
                'application' => 'You have already passed your OJT, so this application can no longer be changed.',
            ]);
        }
    }
}
