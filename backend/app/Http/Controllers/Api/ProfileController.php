<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UpdateHteProfileRequest;
use App\Http\Requests\Api\UpdateInternProfileRequest;
use App\Http\Requests\Api\UpdateProfileLocationRequest;
use App\Http\Requests\Api\UpdateProfilePasswordRequest;
use App\Http\Requests\Api\UpdateProfileRequest;
use App\Http\Resources\CoordinatorResource;
use App\Http\Resources\HteResource;
use App\Http\Resources\InternResource;
use App\Http\Resources\LocationResource;
use App\Http\Resources\UserResource;
use App\Models\AcademicTerm;
use App\Models\Institute;
use App\Models\Program;
use App\Services\EmailVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function __construct(private readonly EmailVerificationService $verification) {}

    /**
     * Everything the profile page needs in a single call: the user, their
     * location and role record, plus reference data for the dropdowns.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'location' => $user->location ? new LocationResource($user->location) : null,
                'intern' => $user->intern ? new InternResource($user->intern) : null,
                'hte' => $user->hte ? new HteResource($user->hte) : null,
                'coordinator' => $user->coordinator ? new CoordinatorResource($user->coordinator) : null,
                'institutes' => Institute::where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name']),
                'programs' => Program::where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'institute_id', 'name']),
                'academic_terms' => AcademicTerm::orderByDesc('start_at')
                    ->get(['id', 'code', 'description', 'status']),
            ],
        ]);
    }

    /**
     * Update the authenticated user's account fields, avatar, and email.
     * An email change re-requires OTP verification (same as admin edits).
     */
    public function updateAccount(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if ($request->hasFile('profile_picture')) {
            if ($user->profile_picture) {
                Storage::disk('public')->delete($user->profile_picture);
            }
            $data['profile_picture'] = $request->file('profile_picture')->store('avatars', 'public');
        } else {
            unset($data['profile_picture']);
        }

        $emailChanged = isset($data['email']) && $data['email'] !== $user->email;

        $user->update($data);

        if ($emailChanged) {
            $user->forceFill(['email_verified_at' => null])->save();
            $this->verification->sendOtp($user->refresh());
        }

        return response()->json([
            'data' => [
                'user' => new UserResource($user->refresh()),
                'email_changed' => $emailChanged,
            ],
        ]);
    }

    /**
     * Update the authenticated user's own address.
     */
    public function updateLocation(UpdateProfileLocationRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->location()->updateOrCreate([], $request->validated());

        return response()->json([
            'data' => [
                'location' => new LocationResource($user->location->refresh()),
            ],
        ]);
    }

    /**
     * Update the intern's own personal details (placement stays read-only).
     */
    public function updateIntern(UpdateInternProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        $intern = $user->intern;

        if (! $intern) {
            abort(404, 'This account has no intern record yet.');
        }

        $intern->update($request->validated());

        return response()->json([
            'data' => [
                'intern' => new InternResource($intern->refresh()),
            ],
        ]);
    }

    /**
     * Update the HTE's own company details (placement stays read-only).
     */
    public function updateHte(UpdateHteProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        $hte = $user->hte;

        if (! $hte) {
            abort(404, 'This account has no HTE record yet.');
        }

        $hte->update($request->validated());

        return response()->json([
            'data' => [
                'hte' => new HteResource($hte->refresh()),
            ],
        ]);
    }

    /**
     * Change the authenticated user's password after confirming the current one.
     */
    public function updatePassword(UpdateProfilePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json([
            'data' => [
                'password_changed' => true,
            ],
        ]);
    }
}
