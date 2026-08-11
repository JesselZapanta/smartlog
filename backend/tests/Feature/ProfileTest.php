<?php

use App\Models\AcademicTerm;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Location;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function profileIntern(): User
{
    $institute = Institute::create(['name' => 'Institute of Computing', 'is_active' => true]);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BSIT', 'is_active' => true]);
    $intern = User::factory()->create(['role' => 'intern']);
    Intern::create([
        'user_id' => $intern->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'date_of_birth' => '2000-05-05',
        'place_of_birth' => 'Ozamiz City',
        'fathers_name' => 'Pedro Dela Cruz',
        'fathers_occupation' => 'Farmer',
        'fathers_contact' => '09170000000',
        'mothers_name' => 'Juana Dela Cruz',
        'mothers_occupation' => 'Teacher',
        'mothers_contact' => '09170000001',
        'parents_guardian_address' => 'Brgy. Mantic, Tangub City',
        'practicum_instructor' => 'Prof. Reyes',
    ]);
    Location::create([
        'user_id' => $intern->id,
        'region' => '10',
        'province' => 'Misamis Occidental',
        'city_municipality' => 'Tangub City',
        'barangay' => 'Mantic',
        'status' => 'active',
    ]);

    return $intern;
}

test('profile shows the authenticated user with role record and reference data', function () {
    $intern = profileIntern();

    $this->actingAs($intern, 'api')
        ->getJson('/api/profile')
        ->assertOk()
        ->assertJsonPath('data.user.email', $intern->email)
        ->assertJsonPath('data.intern.practicum_instructor', 'Prof. Reyes')
        ->assertJsonPath('data.location.barangay', 'Mantic')
        ->assertJsonStructure(['data' => [
            'user', 'location', 'intern', 'hte', 'coordinator',
            'institutes', 'programs', 'academic_terms',
        ]]);
});

test('a user can update their account details and avatar', function () {
    Storage::fake('public');
    $intern = profileIntern();
    $old = UploadedFile::fake()->image('old-avatar.jpg')->store('avatars', 'public');
    $intern->update(['profile_picture' => $old]);

    $this->actingAs($intern, 'api')
        ->put('/api/profile', [
            'firstname' => 'Juan',
            'lastname' => 'Dela Cruz',
            'email' => $intern->email,
            'profile_picture' => UploadedFile::fake()->image('new-avatar.jpg'),
        ], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('data.user.firstname', 'Juan')
        ->assertJsonPath('data.email_changed', false);

    $intern->refresh();
    expect($intern->profile_picture)->not->toBe($old);
    Storage::disk('public')->assertExists($intern->profile_picture);
    Storage::disk('public')->assertMissing($old);
});

test('changing email unverifies the account and requires OTP again', function () {
    Mail::fake();
    $intern = profileIntern();

    $this->actingAs($intern, 'api')
        ->putJson('/api/profile', [
            'firstname' => $intern->firstname,
            'lastname' => $intern->lastname,
            'email' => 'new-email@smartlog.test',
        ])
        ->assertOk()
        ->assertJsonPath('data.email_changed', true);

    $intern->refresh();
    expect($intern->email)->toBe('new-email@smartlog.test');
    expect($intern->email_verified_at)->toBeNull();
});

test('an intern can update their own personal details', function () {
    $intern = profileIntern();

    $this->actingAs($intern, 'api')
        ->putJson('/api/profile/intern', [
            'date_of_birth' => '2001-01-01',
            'place_of_birth' => 'Oroquieta City',
            'fathers_name' => 'Juan Dela Cruz',
            'fathers_occupation' => 'Fisherman',
            'fathers_contact' => '09170000002',
            'mothers_name' => 'Maria Dela Cruz',
            'mothers_occupation' => 'Housewife',
            'mothers_contact' => '09170000003',
            'parents_guardian_address' => 'Brgy. Talisay',
            'practicum_instructor' => 'Prof. Santos',
        ])
        ->assertOk()
        ->assertJsonPath('data.intern.place_of_birth', 'Oroquieta City');

    $intern->refresh();
    expect($intern->intern->practicum_instructor)->toBe('Prof. Santos');
    expect($intern->intern->date_of_birth)->toBe('2001-01-01');
});

test('a user can update their own location', function () {
    $intern = profileIntern();

    $this->actingAs($intern, 'api')
        ->putJson('/api/profile/location', [
            'region' => '13',
            'province' => 'Agusan del Norte',
            'city_municipality' => 'Butuan City',
            'barangay' => 'Lapena',
        ])
        ->assertOk();

    $intern->refresh();
    expect($intern->location->city_municipality)->toBe('Butuan City');
});

test('intern profile endpoint rejects non-intern roles', function () {
    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);

    $this->actingAs($coordinator, 'api')
        ->putJson('/api/profile/intern', [])
        ->assertForbidden();
});

test('a user can change their password with the correct current password', function () {
    $intern = profileIntern();

    $this->actingAs($intern, 'api')
        ->putJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ])
        ->assertOk()
        ->assertJsonPath('data.password_changed', true);

    $intern->refresh();
    expect(Hash::check('new-secret-123', $intern->password))->toBeTrue();
});

test('changing password requires the correct current password', function () {
    $intern = profileIntern();

    $this->actingAs($intern, 'api')
        ->putJson('/api/profile/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('current_password');

    $intern->refresh();
    expect(Hash::check('password', $intern->password))->toBeTrue();
});
