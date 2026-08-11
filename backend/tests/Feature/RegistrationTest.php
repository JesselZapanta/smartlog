<?php

use App\Models\AcademicTerm;
use App\Models\Institute;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function registrationPayload(bool $withActiveTerm = true): array
{
    if ($withActiveTerm) {
        AcademicTerm::create([
            'code' => '2026-2027',
            'description' => 'SY 2026-2027',
            'status' => 'active',
            'start_at' => '2026-08-01 00:00:00',
            'end_at' => '2027-07-31 00:00:00',
        ]);
    }
    $institute = Institute::create(['name' => 'Institute of Computing', 'is_active' => true]);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BSIT', 'is_active' => true]);

    return [
        'firstname' => 'Juan',
        'middlename' => 'Santos',
        'lastname' => 'Dela Cruz',
        'extension' => 'Jr.',
        'contact_number' => '09171234567',
        'email' => 'juan@smartlog.test',
        'password' => 'password',
        'password_confirmation' => 'password',
        'institute_id' => $institute->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'date_of_birth' => '2002-05-14',
        'place_of_birth' => 'Ozamiz City',
        'fathers_name' => 'Pedro Dela Cruz',
        'fathers_occupation' => 'Farmer',
        'fathers_contact' => '09171111111',
        'mothers_name' => 'Maria Dela Cruz',
        'mothers_occupation' => 'Teacher',
        'mothers_contact' => '09172222222',
        'parents_guardian_address' => 'Zone 5, Tangub City',
        'practicum_instructor' => 'Prof. Reyes',
        'region' => 'Northern Mindanao',
        'province' => 'Misamis Occidental',
        'city_municipality' => 'Tangub City',
        'barangay' => 'Mantic',
        'cor' => UploadedFile::fake()->create('cor.pdf', 1024, 'application/pdf'),
    ];
}

test('an intern can register with account, intern and location details', function () {
    $response = $this->post('/api/register', registrationPayload(), ['Accept' => 'application/json']);

    $response->assertStatus(201);

    $user = User::where('email', 'juan@smartlog.test')->first();

    $activeTerm = AcademicTerm::where('status', 'active')->first();

    expect($user)->not->toBeNull();
    expect($user->role)->toBe('intern');
    expect($user->email_verified_at)->toBeNull();
    expect($user->intern)->not->toBeNull();
    expect($user->intern->academic_year_id)->toBe($activeTerm->id);
    expect($user->intern->cor_path)->not->toBeNull();
    expect($user->location)->not->toBeNull();
    expect($user->location->barangay)->toBe('Mantic');
    expect($response->json('data.access_token'))->toBeNull();
    $response->assertJsonPath('data.user.email', 'juan@smartlog.test');
});

test('registration assigns the active academic year when multiple exist', function () {
    $active = AcademicTerm::create([
        'code' => '2026-2027',
        'description' => 'SY 2026-2027',
        'status' => 'active',
        'start_at' => '2026-08-01 00:00:00',
        'end_at' => '2027-07-31 00:00:00',
    ]);
    AcademicTerm::create([
        'code' => '2027-2028',
        'description' => 'SY 2027-2028',
        'status' => 'inactive',
        'start_at' => '2027-08-01 00:00:00',
        'end_at' => '2028-07-31 00:00:00',
    ]);

    $this->post('/api/register', registrationPayload(false), ['Accept' => 'application/json'])->assertStatus(201);

    $user = User::where('email', 'juan@smartlog.test')->first();

    expect($user->intern->academic_year_id)->toBe($active->id);
});

test('registration falls back to the most recent academic year when none is active', function () {
    $latest = AcademicTerm::create([
        'code' => '2026-2027',
        'description' => 'SY 2026-2027',
        'status' => 'inactive',
        'start_at' => '2026-08-01 00:00:00',
        'end_at' => '2027-07-31 00:00:00',
    ]);
    AcademicTerm::create([
        'code' => '2025-2026',
        'description' => 'SY 2025-2026',
        'status' => 'inactive',
        'start_at' => '2025-08-01 00:00:00',
        'end_at' => '2026-07-31 00:00:00',
    ]);

    $this->post('/api/register', registrationPayload(false), ['Accept' => 'application/json'])->assertStatus(201);

    $user = User::where('email', 'juan@smartlog.test')->first();

    expect($user->intern->academic_year_id)->toBe($latest->id);
});

test('registration fails when no academic year exists', function () {
    $payload = registrationPayload(false);
    $payload['email'] = 'other@smartlog.test';

    $this->post('/api/register', $payload, ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('academic_year_id');

    expect(User::where('email', 'other@smartlog.test')->exists())->toBeFalse();
});

test('registration reference data is public and only includes active records', function () {
    AcademicTerm::create([
        'code' => '2026-2027',
        'description' => 'SY 2026-2027',
        'status' => 'active',
        'start_at' => '2026-08-01 00:00:00',
        'end_at' => '2027-07-31 00:00:00',
    ]);
    AcademicTerm::create([
        'code' => '2025-2026',
        'description' => 'SY 2025-2026',
        'status' => 'inactive',
        'start_at' => '2025-08-01 00:00:00',
        'end_at' => '2026-07-31 00:00:00',
    ]);
    $institute = Institute::create(['name' => 'Institute of Computing', 'is_active' => true]);
    Institute::create(['name' => 'Archived Institute', 'is_active' => false]);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BSIT', 'is_active' => true]);
    Program::create(['institute_id' => $institute->id, 'name' => 'Old Program', 'is_active' => false]);

    $this->getJson('/api/register/reference-data')
        ->assertOk()
        ->assertJsonCount(1, 'data.academic_terms')
        ->assertJsonCount(1, 'data.institutes')
        ->assertJsonCount(1, 'data.programs')
        ->assertJsonPath('data.programs.0.institute_id', $institute->id);
});

test('registration with a profile picture stores the avatar', function () {
    Storage::fake('public');

    $response = $this->post('/api/register', [
        ...registrationPayload(),
        'profile_picture' => UploadedFile::fake()->image('avatar.jpg'),
    ], ['Accept' => 'application/json']);

    $response->assertStatus(201);

    $user = User::where('email', 'juan@smartlog.test')->first();

    expect($user->profile_picture)->not->toBeNull();
    Storage::disk('public')->assertExists($user->profile_picture);
});

test('registration rejects a duplicate email', function () {
    User::factory()->create(['email' => 'juan@smartlog.test']);

    $this->post('/api/register', registrationPayload(), ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');

    expect(User::where('email', 'juan@smartlog.test')->count())->toBe(1);
});

test('registration requires intern and location fields', function () {
    $payload = registrationPayload();
    unset($payload['date_of_birth'], $payload['place_of_birth'], $payload['region']);

    $this->post('/api/register', $payload, ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['date_of_birth', 'place_of_birth', 'region']);

    expect(User::where('email', 'juan@smartlog.test')->exists())->toBeFalse();
});

test('registration requires matching passwords', function () {
    $payload = registrationPayload();
    $payload['password_confirmation'] = 'different';

    $this->post('/api/register', $payload, ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('password');

    expect(User::where('email', 'juan@smartlog.test')->exists())->toBeFalse();
});

test('registration requires a certificate of registration (COR)', function () {
    $payload = registrationPayload();
    unset($payload['cor']);

    $this->post('/api/register', $payload, ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('cor');

    expect(User::where('email', 'juan@smartlog.test')->exists())->toBeFalse();
});

test('registration stores the COR pdf on the public disk', function () {
    Storage::fake('public');

    $this->post('/api/register', registrationPayload(), ['Accept' => 'application/json'])->assertStatus(201);

    $user = User::where('email', 'juan@smartlog.test')->first();

    expect($user->intern->cor_path)->not->toBeNull();
    Storage::disk('public')->assertExists($user->intern->cor_path);
});
