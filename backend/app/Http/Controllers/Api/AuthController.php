<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Intern\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\AcademicTerm;
use App\Models\Institute;
use App\Models\Program;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\EmailVerificationService;
use App\Services\ImageOptimizer;
use App\Services\PasswordResetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly EmailVerificationService $verification,
        private readonly PasswordResetService $passwordReset,
    ) {}

    public function referenceData(): JsonResponse
    {
        return response()->json([
            'data' => [
                'academic_terms' => AcademicTerm::where('status', 'active')
                    ->orderByDesc('start_at')
                    ->get(['id', 'code']),
                'institutes' => Institute::where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name']),
                'programs' => Program::where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'institute_id', 'name']),
            ],
        ]);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $academicYear = AcademicTerm::where('status', 'active')->latest('start_at')->first()
            ?? AcademicTerm::latest('start_at')->first();

        if (! $academicYear) {
            throw ValidationException::withMessages([
                'academic_year_id' => ['No academic year is available. Please try again later.'],
            ]);
        }

        if ($request->hasFile('profile_picture')) {
            $data['profile_picture'] = ImageOptimizer::storeAvatar($request->file('profile_picture'));
        }

        if ($request->hasFile('cor')) {
            $data['cor_path'] = $request->file('cor')->store('cor', 'public');
        }

        $user = User::create([
            'uuid' => (string) Str::uuid(),
            'firstname' => $data['firstname'],
            'middlename' => $data['middlename'] ?? null,
            'lastname' => $data['lastname'],
            'extension' => $data['extension'] ?? null,
            'contact_number' => $data['contact_number'] ?? null,
            'profile_picture' => $data['profile_picture'] ?? null,
            'role' => 'intern',
            'email' => $data['email'],
            'password' => $data['password'],
            'email_verified_at' => null,
        ]);

        $user->intern()->create([
            'academic_year_id' => $academicYear->id,
            'institute_id' => $data['institute_id'],
            'program_id' => $data['program_id'],
            'date_of_birth' => $data['date_of_birth'],
            'place_of_birth' => $data['place_of_birth'],
            'fathers_name' => $data['fathers_name'],
            'fathers_occupation' => $data['fathers_occupation'],
            'fathers_contact' => $data['fathers_contact'],
            'mothers_name' => $data['mothers_name'],
            'mothers_occupation' => $data['mothers_occupation'],
            'mothers_contact' => $data['mothers_contact'],
            'parents_guardian_address' => $data['parents_guardian_address'],
            'practicum_instructor' => $data['practicum_instructor'],
            'cor_path' => $data['cor_path'] ?? null,
        ]);

        $user->location()->create([
            'region' => $data['region'],
            'province' => $data['province'],
            'city_municipality' => $data['city_municipality'],
            'barangay' => $data['barangay'],
            'status' => 'active',
        ]);

        $this->verification->sendOtp($user);

        return response()->json([
            'data' => [
                'message' => 'Registration successful. Enter the verification code sent to your email.',
                'user' => new UserResource($user),
            ],
        ], 201);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = User::where('email', $data['email'])->firstOrFail();

        $wasUnverified = is_null($user->email_verified_at);

        if ($wasUnverified && ! $this->verification->verify($user, $data['code'])) {
            throw ValidationException::withMessages([
                'code' => ['The verification code is invalid or has expired.'],
            ]);
        }

        $this->notifyPendingRegistration($user, $wasUnverified);

        $token = Auth::guard('api')->login($user);

        return response()->json([
            'data' => [
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => Auth::guard('api')->factory()->getTTL() * 60,
                'user' => new UserResource($user),
            ],
        ]);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        $user = User::where('email', $data['email'])->firstOrFail();

        if ($user->email_verified_at) {
            return response()->json([
                'data' => ['message' => 'Your email is already verified. You can sign in.'],
            ]);
        }

        $this->verification->sendOtp($user);

        return response()->json([
            'data' => ['message' => 'A new verification code has been sent to your email.'],
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        $user = User::where('email', $data['email'])->firstOrFail();

        $this->passwordReset->sendOtp($user);

        return response()->json([
            'data' => ['message' => 'A password reset code has been sent to your email. It expires in 10 minutes.'],
        ]);
    }

    public function verifyResetCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = User::where('email', $data['email'])->firstOrFail();

        if (! $this->passwordReset->verify($user, $data['code'])) {
            throw ValidationException::withMessages([
                'code' => ['The code is invalid or has expired.'],
            ]);
        }

        return response()->json([
            'data' => ['message' => 'Code verified. You can now reset your password.'],
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::where('email', $data['email'])->firstOrFail();

        if (! $this->passwordReset->verify($user, $data['code'])) {
            throw ValidationException::withMessages([
                'code' => ['The code is invalid or has expired.'],
            ]);
        }

        $user->forceFill([
            'password' => $data['password'],
        ])->save();

        $this->passwordReset->clearOtp($user);

        return response()->json([
            'data' => ['message' => 'Your password has been reset successfully. You can now sign in.'],
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! $token = Auth::guard('api')->attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        /** @var User $user */
        $user = Auth::guard('api')->user();

        if (! $user->email_verified_at) {
            Auth::guard('api')->logout();

            throw ValidationException::withMessages([
                'email' => ['Please verify your email address first. Check your inbox for the one-time code.'],
            ])->status(403);
        }

        return response()->json([
            'data' => [
                'access_token' => $token,
                'token_type' => 'bearer',
                'expires_in' => Auth::guard('api')->factory()->getTTL() * 60,
                'user' => new UserResource($user),
            ],
        ]);
    }

    public function me(): JsonResponse
    {
        /** @var User $user */
        $user = Auth::guard('api')->user();

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    public function logout(): JsonResponse
    {
        Auth::guard('api')->logout();

        return response()->json([
            'data' => ['message' => 'Successfully logged out.'],
        ]);
    }

    /**
     * Notify the coordinators that an intern's registration is awaiting review,
     * but only the first time the intern's email gets verified.
     */
    private function notifyPendingRegistration(User $user, bool $wasUnverified): void
    {
        if (! $wasUnverified || $user->role !== 'intern') {
            return;
        }

        $intern = $user->intern;

        if (! $intern || $intern->status !== 'pending') {
            return;
        }

        $alreadyNotified = UserNotification::where('type', 'registration_submitted')
            ->whereJsonContains('data->uuid', $user->uuid)
            ->exists();

        if ($alreadyNotified) {
            return;
        }

        UserNotification::notifyCoordinators(
            (int) $intern->institute_id,
            'registration_submitted',
            'New registration submitted',
            "{$user->full_name} verified their email and their OJT registration is awaiting review.",
            ['uuid' => $user->uuid],
        );
    }
}
