<?php

namespace App\Http\Controllers\Api\OjtCoordinator\Htes;

use App\Http\Controllers\Controller;
use App\Http\Requests\OjtCoordinator\CoordinatorStoreHteRequest;
use App\Http\Requests\OjtCoordinator\CoordinatorUpdateHteRequest;
use App\Http\Resources\Hte\HteDetailResource;
use App\Http\Resources\Hte\HteListResource;
use App\Models\Hte;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use App\Services\EmailVerificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class HteController extends Controller
{
    public function __construct(private readonly EmailVerificationService $verification) {}

    /**
     * Reference data for the coordinator's HTE form: their institute + its programs.
     */
    public function reference(Request $request): JsonResponse
    {
        $instituteId = $this->instituteId($request);

        if (! $instituteId) {
            return response()->json([
                'data' => ['institute' => null, 'programs' => []],
            ]);
        }

        $institute = $request->user()->coordinator?->institute;

        return response()->json([
            'data' => [
                'institute' => $institute ? ['id' => $institute->id, 'name' => $institute->name] : null,
                'programs' => Program::where('institute_id', $instituteId)
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name']),
            ],
        ]);
    }

    /**
     * CRUD list of HTEs for the coordinator's institute.
     * When an academic year is provided, assigned counts are scoped to that year.
     */
    public function index(Request $request): JsonResponse
    {
        $instituteId = $this->instituteId($request);

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

        $academicYearId = $request->integer('academic_year_id');

        $assignedCountQuery = fn ($builder) => $builder;
        if ($academicYearId > 0) {
            $assignedCountQuery = fn ($builder) => $builder->where('academic_year_id', $academicYearId);
        }

        $query = Hte::with(['user', 'institute', 'program'])
            ->withCount(['assignedInterns' => $assignedCountQuery])
            ->where('institute_id', $instituteId);

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->where(function (Builder $builder) use ($search): void {
                $builder->where('name', 'like', "%{$search}%")
                    ->orWhereHas('user', function (Builder $userBuilder) use ($search): void {
                        $userBuilder->where('firstname', 'like', "%{$search}%")
                            ->orWhere('middlename', 'like', "%{$search}%")
                            ->orWhere('lastname', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $status = $request->string('status')->trim()->toString();

        if (in_array($status, ['active', 'expired', 'inactive'], true)) {
            $query->where('status', $status);
        }

        $sort = $request->string('sort', 'id')->trim()->toString();
        $order = $request->string('order', 'desc')->trim()->toString();

        if (! in_array($sort, ['id', 'status', 'created_at'], true)) {
            $sort = 'id';
        }

        if (! in_array($order, ['asc', 'desc'], true)) {
            $order = 'desc';
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $htes = $query->orderBy($sort, $order)->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => HteListResource::collection($htes),
            'meta' => [
                'current_page' => $htes->currentPage(),
                'last_page' => $htes->lastPage(),
                'per_page' => $htes->perPage(),
                'total' => $htes->total(),
                'from' => $htes->firstItem(),
                'to' => $htes->lastItem(),
            ],
        ]);
    }

    /**
     * View-only detail for a single HTE of the coordinator's institute.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $hte = $this->authorizeHte($request, $user);

        $hte->loadMissing(['user.location', 'program', 'institute']);

        return response()->json([
            'data' => new HteDetailResource($hte),
        ]);
    }

    /**
     * Approved interns of the coordinator's institute (for the given academic year)
     * that are not yet assigned to any HTE.
     */
    public function assignableInterns(Request $request, User $user): JsonResponse
    {
        $hte = $this->authorizeHte($request, $user);

        $academicYearId = $request->integer('academic_year_id');

        if ($academicYearId <= 0) {
            throw ValidationException::withMessages([
                'academic_year_id' => ['An academic year is required.'],
            ]);
        }

        $query = Intern::with(['user', 'program'])
            ->where('institute_id', $hte->institute_id)
            ->where('academic_year_id', $academicYearId)
            ->where('status', 'approved')
            ->whereNull('assigned_hte');

        $search = $request->string('search')->trim()->toString();

        if ($search !== '') {
            $query->whereHas('user', function (Builder $builder) use ($search): void {
                $builder->where('firstname', 'like', "%{$search}%")
                    ->orWhere('middlename', 'like', "%{$search}%")
                    ->orWhere('lastname', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = min(max($request->integer('per_page', 10), 1), 100);

        $interns = $query->orderBy('id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Intern $intern): array => $this->internListItem($intern));

        return response()->json([
            'data' => $interns->items(),
            'meta' => [
                'current_page' => $interns->currentPage(),
                'last_page' => $interns->lastPage(),
                'per_page' => $interns->perPage(),
                'total' => $interns->total(),
                'from' => $interns->firstItem(),
                'to' => $interns->lastItem(),
            ],
        ]);
    }

    /**
     * Interns of the given academic year currently assigned to this HTE.
     */
    public function assignedInterns(Request $request, User $user): JsonResponse
    {
        $hte = $this->authorizeHte($request, $user);

        $academicYearId = $request->integer('academic_year_id');

        if ($academicYearId <= 0) {
            throw ValidationException::withMessages([
                'academic_year_id' => ['An academic year is required.'],
            ]);
        }

        $interns = Intern::with(['user', 'program'])
            ->where('institute_id', $hte->institute_id)
            ->where('academic_year_id', $academicYearId)
            ->where('status', 'approved')
            ->where('assigned_hte', $hte->id)
            ->orderBy('id')
            ->get()
            ->map(fn (Intern $intern): array => $this->internListItem($intern))
            ->values();

        return response()->json([
            'data' => $interns,
        ]);
    }

    /**
     * Unassign selected interns (of the given academic year) from the HTE.
     */
    public function unassign(Request $request, User $user): JsonResponse
    {
        $hte = $this->authorizeHte($request, $user);

        $data = $request->validate([
            'academic_year_id' => ['required', 'integer', 'exists:academic_terms,id'],
            'intern_ids' => ['required', 'array', 'min:1'],
            'intern_ids.*' => ['integer', 'distinct'],
        ]);

        $interns = Intern::where('institute_id', $hte->institute_id)
            ->where('academic_year_id', $data['academic_year_id'])
            ->where('assigned_hte', $hte->id)
            ->whereIn('id', $data['intern_ids'])
            ->get();

        foreach ($interns as $intern) {
            $intern->forceFill(['assigned_hte' => null])->save();
        }

        return response()->json([
            'data' => [
                'message' => $interns->count().' intern(s) unassigned from '.$hte->name.'.',
                'count' => $interns->count(),
            ],
        ]);
    }

    private function internListItem(Intern $intern): array
    {
        return [
            'id' => $intern->id,
            'uuid' => $intern->user->uuid,
            'full_name' => $intern->user->full_name,
            'email' => $intern->user->email,
            'program' => $intern->program?->name,
        ];
    }

    /**
     * Assign selected interns (of the given academic year) to the HTE.
     */
    public function assign(Request $request, User $user): JsonResponse
    {
        $hte = $this->authorizeHte($request, $user);

        $data = $request->validate([
            'academic_year_id' => ['required', 'integer', 'exists:academic_terms,id'],
            'intern_ids' => ['required', 'array', 'min:1'],
            'intern_ids.*' => ['integer', 'distinct'],
        ]);

        $interns = Intern::where('institute_id', $hte->institute_id)
            ->where('academic_year_id', $data['academic_year_id'])
            ->where('status', 'approved')
            ->whereNull('assigned_hte')
            ->whereIn('id', $data['intern_ids'])
            ->get();

        foreach ($interns as $intern) {
            $intern->forceFill(['assigned_hte' => $hte->id])->save();
        }

        return response()->json([
            'data' => [
                'message' => $interns->count().' intern(s) assigned to '.$hte->name.'.',
                'count' => $interns->count(),
            ],
        ]);
    }

    /**
     * Create an HTE account (user + hte record + optional location) for the coordinator's institute.
     */
    public function store(CoordinatorStoreHteRequest $request): JsonResponse
    {
        $instituteId = $this->instituteId($request);

        if (! $instituteId) {
            throw ValidationException::withMessages([
                'institute' => ['Your account is not assigned to an institute yet.'],
            ]);
        }

        $data = $request->validated();

        if (! Program::where('id', $data['program_id'])->where('institute_id', $instituteId)->exists()) {
            throw ValidationException::withMessages([
                'program_id' => ['The selected program does not belong to your institute.'],
            ]);
        }

        if ($request->hasFile('profile_picture')) {
            $data['profile_picture'] = $request->file('profile_picture')->store('avatars', 'public');
        }

        $user = User::create([
            'uuid' => (string) Str::uuid(),
            'firstname' => $data['firstname'],
            'middlename' => $data['middlename'] ?? null,
            'lastname' => $data['lastname'],
            'extension' => $data['extension'] ?? null,
            'contact_number' => $data['contact_number'] ?? null,
            'profile_picture' => $data['profile_picture'] ?? null,
            'role' => 'hte',
            'email' => $data['email'],
            'password' => $data['password'],
            'email_verified_at' => null,
        ]);

        $moaPath = null;
        if ($request->hasFile('moa')) {
            $moaPath = $request->file('moa')->store('moa', 'public');
        }

        $user->hte()->create([
            'name' => $data['name'],
            'institute_id' => $instituteId,
            'program_id' => $data['program_id'],
            'moa' => $moaPath,
            'start_at' => $data['start_at'] ?? null,
            'end_at' => $data['end_at'] ?? null,
            'status' => $data['status'] ?? 'active',
        ]);

        if ($request->filled('region')) {
            $user->location()->create([
                'region' => $data['region'],
                'province' => $data['province'] ?? '',
                'city_municipality' => $data['city_municipality'] ?? '',
                'barangay' => $data['barangay'] ?? '',
                'status' => 'active',
            ]);
        }

        $this->verification->sendOtp($user);

        $user->load('hte.institute', 'hte.program');

        return response()->json([
            'data' => new HteDetailResource($user->hte),
        ], 201);
    }

    /**
     * Update an HTE of the coordinator's institute.
     */
    public function update(CoordinatorUpdateHteRequest $request, User $user): JsonResponse
    {
        $hte = $this->authorizeHte($request, $user);
        $data = $request->validated();

        if (! Program::where('id', $data['program_id'])->where('institute_id', $hte->institute_id)->exists()) {
            throw ValidationException::withMessages([
                'program_id' => ['The selected program does not belong to your institute.'],
            ]);
        }

        if ($request->hasFile('profile_picture')) {
            if ($user->profile_picture) {
                Storage::disk('public')->delete($user->profile_picture);
            }
            $data['profile_picture'] = $request->file('profile_picture')->store('avatars', 'public');
        } else {
            unset($data['profile_picture']);
        }

        $emailChanged = isset($data['email']) && $data['email'] !== $user->email;

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $user->update(collect($data)->only([
            'firstname', 'middlename', 'lastname', 'extension', 'contact_number',
            'profile_picture', 'email', 'password',
        ])->all());

        if ($emailChanged) {
            $user->forceFill(['email_verified_at' => null])->save();
            $this->verification->sendOtp($user->refresh());
        }

        $hteData = collect($data)->only(['name', 'program_id', 'start_at', 'end_at', 'status'])->all();

        if ($request->hasFile('moa')) {
            if ($hte->moa) {
                Storage::disk('public')->delete($hte->moa);
            }
            $hteData['moa'] = $request->file('moa')->store('moa', 'public');
        }

        $hte->fill($hteData);
        $hte->save();

        if ($request->filled('region')) {
            $user->location()->updateOrCreate([], [
                'region' => $data['region'],
                'province' => $data['province'] ?? '',
                'city_municipality' => $data['city_municipality'] ?? '',
                'barangay' => $data['barangay'] ?? '',
                'status' => 'active',
            ]);
        }

        $hte->loadMissing(['user.location', 'program', 'institute']);

        return response()->json([
            'data' => new HteDetailResource($hte->refresh()),
        ]);
    }

    /**
     * Delete an HTE of the coordinator's institute.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorizeHte($request, $user);

        if ($user->profile_picture) {
            Storage::disk('public')->delete($user->profile_picture);
        }

        $user->delete();

        return response()->json([
            'data' => ['message' => 'HTE deleted successfully.'],
        ]);
    }

    /**
     * The coordinator's institute id, or null if unassigned.
     */
    private function instituteId(Request $request): ?int
    {
        return $request->user()->coordinator?->institute_id;
    }

    /**
     * Ensure the HTE belongs to the coordinator's institute.
     */
    private function authorizeHte(Request $request, User $user): Hte
    {
        $instituteId = $this->instituteId($request);

        if (! $instituteId) {
            abort(403, 'Your account is not assigned to an institute yet.');
        }

        $hte = $user->hte;

        if (! $hte) {
            abort(404, 'This user has no HTE record.');
        }

        if ($hte->institute_id !== $instituteId) {
            abort(403, 'This HTE does not belong to your institute.');
        }

        return $hte;
    }
}
