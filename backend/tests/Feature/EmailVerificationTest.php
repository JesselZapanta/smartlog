<?php

use App\Mail\EmailVerificationOtp;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

function registeredUnverifiedUser(): User
{
    $user = User::factory()->create(['email' => 'test@smartlog.test', 'email_verified_at' => null]);
    $user->forceFill([
        'email_otp' => Hash::make('123456'),
        'email_otp_expires_at' => now()->addMinutes(10),
    ])->save();

    return $user;
}

test('an unverified user cannot log in', function () {
    registeredUnverifiedUser();

    $this->postJson('/api/login', ['email' => 'test@smartlog.test', 'password' => 'password'])
        ->assertStatus(403)
        ->assertJsonValidationErrors('email');

    $this->assertGuest('api');
});

test('a verified user can log in', function () {
    User::factory()->create(['email' => 'test@smartlog.test', 'email_verified_at' => now()]);

    $this->postJson('/api/login', ['email' => 'test@smartlog.test', 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.user.email', 'test@smartlog.test')
        ->assertJsonStructure(['data' => ['access_token']]);
});

test('verifying with the correct code marks the email verified and logs the user in', function () {
    $user = registeredUnverifiedUser();

    $this->postJson('/api/verify-email', ['email' => 'test@smartlog.test', 'code' => '123456'])
        ->assertOk()
        ->assertJsonStructure(['data' => ['access_token', 'user']]);

    $user->refresh();

    expect($user->email_verified_at)->not->toBeNull();
    expect($user->email_otp)->toBeNull();
    expect($user->email_otp_expires_at)->toBeNull();
});

test('verifying with a wrong code is rejected', function () {
    registeredUnverifiedUser();

    $this->postJson('/api/verify-email', ['email' => 'test@smartlog.test', 'code' => '000000'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('code');

    expect(User::first()->email_verified_at)->toBeNull();
});

test('verifying with an expired code is rejected', function () {
    $user = registeredUnverifiedUser();
    $user->forceFill(['email_otp_expires_at' => now()->subMinute()])->save();

    $this->postJson('/api/verify-email', ['email' => 'test@smartlog.test', 'code' => '123456'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('code');

    expect($user->refresh()->email_verified_at)->toBeNull();
});

test('verifying an already verified email still signs the user in', function () {
    $user = User::factory()->create(['email' => 'test@smartlog.test', 'email_verified_at' => now()]);

    $this->postJson('/api/verify-email', ['email' => 'test@smartlog.test', 'code' => '123456'])
        ->assertOk()
        ->assertJsonStructure(['data' => ['access_token']]);

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('resending the code delivers a fresh OTP email', function () {
    Mail::fake();

    $user = registeredUnverifiedUser();

    $this->postJson('/api/verify-email/resend', ['email' => 'test@smartlog.test'])
        ->assertOk()
        ->assertJsonPath('data.message', 'A new verification code has been sent to your email.');

    Mail::assertSent(EmailVerificationOtp::class, function (EmailVerificationOtp $mail) use ($user) {
        return $mail->hasTo($user->email) && strlen($mail->code) === 6;
    });

    $user->refresh();

    expect($user->email_otp)->not->toBeNull();
    expect(Hash::check(Mail::sent(EmailVerificationOtp::class)->first()->code, $user->email_otp))->toBeTrue();
});

test('resending for an already verified email reports verified', function () {
    User::factory()->create(['email' => 'test@smartlog.test', 'email_verified_at' => now()]);

    $this->postJson('/api/verify-email/resend', ['email' => 'test@smartlog.test'])
        ->assertOk()
        ->assertJsonPath('data.message', 'Your email is already verified. You can sign in.');
});

test('verification requires a valid email and a 6-digit code', function () {
    $this->postJson('/api/verify-email', ['email' => 'nobody@smartlog.test', 'code' => '12'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email', 'code']);
});
