<?php

namespace App\Services;

use App\Mail\EmailVerificationOtp;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class EmailVerificationService
{
    public const EXPIRES_IN_MINUTES = 10;

    /**
     * Generate a fresh OTP for the user (stored hashed) and e-mail it.
     */
    public function sendOtp(User $user): string
    {
        $code = (string) random_int(100000, 999999);

        $user->forceFill([
            'email_otp' => Hash::make($code),
            'email_otp_expires_at' => now()->addMinutes(self::EXPIRES_IN_MINUTES),
        ])->save();

        Mail::to($user)->send(new EmailVerificationOtp($code, self::EXPIRES_IN_MINUTES, $user));

        return $code;
    }

    /**
     * Verify the submitted code against the user's stored OTP.
     */
    public function verify(User $user, string $code): bool
    {
        if (! $user->email_otp || ! $user->email_otp_expires_at) {
            return false;
        }

        if ($user->email_otp_expires_at->isPast()) {
            return false;
        }

        if (! Hash::check($code, $user->email_otp)) {
            return false;
        }

        $user->forceFill([
            'email_verified_at' => now(),
            'email_otp' => null,
            'email_otp_expires_at' => null,
        ])->save();

        return true;
    }
}
