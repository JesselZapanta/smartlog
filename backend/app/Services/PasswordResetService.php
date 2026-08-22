<?php

namespace App\Services;

use App\Mail\PasswordResetOtp;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class PasswordResetService
{
    public const EXPIRES_IN_MINUTES = 10;

    public function sendOtp(User $user): string
    {
        $code = (string) random_int(100000, 999999);

        $user->forceFill([
            'password_reset_otp' => Hash::make($code),
            'password_reset_otp_expires_at' => now()->addMinutes(self::EXPIRES_IN_MINUTES),
        ])->save();

        Mail::to($user)->send(new PasswordResetOtp($code, self::EXPIRES_IN_MINUTES, $user));

        return $code;
    }

    public function verify(User $user, string $code): bool
    {
        if (! $user->password_reset_otp || ! $user->password_reset_otp_expires_at) {
            return false;
        }

        if ($user->password_reset_otp_expires_at->isPast()) {
            return false;
        }

        if (! Hash::check($code, $user->password_reset_otp)) {
            return false;
        }

        return true;
    }

    public function clearOtp(User $user): void
    {
        $user->forceFill([
            'password_reset_otp' => null,
            'password_reset_otp_expires_at' => null,
        ])->save();
    }
}
