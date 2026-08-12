<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Location;
use App\Models\Program;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

function notificationInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function notificationProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function notificationCoordinator(Institute $institute): User
{
    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $coordinator->id,
        'institute_id' => $institute->id,
        'program_id' => notificationProgram($institute)->id,
    ]);

    return $coordinator;
}

function notificationIntern(Institute $institute, Program $program, array $attributes = []): User
{
    $intern = User::factory()->create(['role' => 'intern']);
    $record = Intern::create([
        'user_id' => $intern->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    $record->forceFill(array_intersect_key($attributes, array_flip([
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ])))->save();

    return $intern;
}

test('a user lists only their own notifications with the unread count', function () {
    $user = User::factory()->create();
    UserNotification::factory()->count(3)->create(['user_id' => $user->id]);
    UserNotification::factory()->count(2)->create(['user_id' => $user->id, 'is_read' => true]);

    $other = User::factory()->create();
    UserNotification::factory()->count(4)->create(['user_id' => $other->id]);

    $this->actingAs($user, 'api')
        ->getJson('/api/notifications')
        ->assertOk()
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('meta.unread_count', 3)
        ->assertJsonPath('meta.total', 5);
});

test('notifications are listed newest first', function () {
    $user = User::factory()->create();
    $old = UserNotification::factory()->create(['user_id' => $user->id, 'created_at' => now()->subDay()]);
    $new = UserNotification::factory()->create(['user_id' => $user->id, 'created_at' => now()]);

    $this->actingAs($user, 'api')
        ->getJson('/api/notifications')
        ->assertOk()
        ->assertJsonPath('data.0.id', $new->id)
        ->assertJsonPath('data.1.id', $old->id);
});

test('a user can mark their own notification as read', function () {
    $user = User::factory()->create();
    $notification = UserNotification::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user, 'api')
        ->putJson("/api/notifications/{$notification->id}/read")
        ->assertOk()
        ->assertJsonPath('data.is_read', true);

    expect($notification->refresh()->is_read)->toBeTrue();
});

test('a user cannot mark another user notification as read', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $notification = UserNotification::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user, 'api')
        ->putJson("/api/notifications/{$notification->id}/read")
        ->assertNotFound();

    expect($notification->refresh()->is_read)->toBeFalse();
});

test('mark all read clears every unread notification', function () {
    $user = User::factory()->create();
    UserNotification::factory()->count(3)->create(['user_id' => $user->id]);

    $this->actingAs($user, 'api')
        ->putJson('/api/notifications/read-all')
        ->assertOk()
        ->assertJsonPath('data.updated', 3);

    expect($user->userNotifications()->where('is_read', false)->count())->toBe(0);
});

test('registering an intern notifies the coordinators of the chosen institute', function () {
    Mail::fake();
    AcademicTerm::create(['code' => '2025-2026', 'description' => 'First Semester', 'status' => 'active']);

    $institute = notificationInstitute();
    $program = notificationProgram($institute);
    $coordinator = notificationCoordinator($institute);

    $this->post('/api/register', [
        'firstname' => 'Juan',
        'lastname' => 'Dela Cruz',
        'email' => 'juan@smartlog.test',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'date_of_birth' => '2000-01-01',
        'place_of_birth' => 'Tangub City',
        'fathers_name' => 'Pedro Dela Cruz',
        'fathers_occupation' => 'Farmer',
        'fathers_contact' => '09170000000',
        'mothers_name' => 'Juana Dela Cruz',
        'mothers_occupation' => 'Teacher',
        'mothers_contact' => '09170000001',
        'parents_guardian_address' => 'Brgy. Mantic, Tangub City',
        'practicum_instructor' => 'Prof. Santos',
        'cor' => UploadedFile::fake()->create('cor.pdf', 1024, 'application/pdf'),
        'region' => '10',
        'province' => 'Misamis Occidental',
        'city_municipality' => 'Tangub City',
        'barangay' => 'Mantic',
    ], ['Accept' => 'application/json'])->assertStatus(201);

    $notification = UserNotification::where('user_id', $coordinator->id)->first();

    expect($notification)->not->toBeNull();
    expect($notification->type)->toBe('registration_submitted');
    expect($notification->title)->toBe('New registration submitted');
    expect($notification->is_read)->toBeFalse();

    $intern = User::where('email', 'juan@smartlog.test')->first();
    expect($notification->data)->toMatchArray(['uuid' => $intern->uuid]);
});

test('registering does not notify coordinators of other institutes', function () {
    Mail::fake();
    AcademicTerm::create(['code' => '2025-2026', 'description' => 'First Semester', 'status' => 'active']);

    $institute = notificationInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = notificationProgram($institute);
    $otherProgram = Program::create(['institute_id' => $otherInstitute->id, 'name' => 'BS Education']);
    $otherCoordinator = notificationCoordinator($otherInstitute);

    $this->post('/api/register', [
        'firstname' => 'Maria',
        'lastname' => 'Santos',
        'email' => 'maria@smartlog.test',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'date_of_birth' => '2000-02-02',
        'place_of_birth' => 'Ozamiz City',
        'fathers_name' => 'Juan Santos',
        'fathers_occupation' => 'Driver',
        'fathers_contact' => '09170000002',
        'mothers_name' => 'Ana Santos',
        'mothers_occupation' => 'Housewife',
        'mothers_contact' => '09170000003',
        'parents_guardian_address' => 'Brgy. Mantic, Tangub City',
        'practicum_instructor' => 'Prof. Reyes',
        'cor' => UploadedFile::fake()->create('cor.pdf', 1024, 'application/pdf'),
        'region' => '10',
        'province' => 'Misamis Occidental',
        'city_municipality' => 'Tangub City',
        'barangay' => 'Mantic',
    ], ['Accept' => 'application/json'])->assertStatus(201);

    expect(UserNotification::where('user_id', $otherCoordinator->id)->count())->toBe(0);
});

test('approving a registration pushes an unread notification to the intern', function () {
    Mail::fake();

    $institute = notificationInstitute();
    $program = notificationProgram($institute);
    $intern = notificationIntern($institute, $program);

    $this->actingAs(notificationCoordinator($institute), 'api')
        ->postJson("/api/registrations/{$intern->uuid}/approve")
        ->assertOk();

    $notification = UserNotification::where('user_id', $intern->id)->first();

    expect($notification)->not->toBeNull();
    expect($notification->type)->toBe('registration_approved');
    expect($notification->is_read)->toBeFalse();
    expect($notification->data)->toMatchArray(['uuid' => $intern->uuid]);
});

test('rejecting a registration pushes a rejected notification with the reason', function () {
    Mail::fake();

    $institute = notificationInstitute();
    $program = notificationProgram($institute);
    $intern = notificationIntern($institute, $program);

    $this->actingAs(notificationCoordinator($institute), 'api')
        ->postJson("/api/registrations/{$intern->uuid}/reject", ['reason' => 'Incomplete guardianship details'])
        ->assertOk();

    $notification = UserNotification::where('user_id', $intern->id)->first();

    expect($notification)->not->toBeNull();
    expect($notification->type)->toBe('registration_rejected');
    expect($notification->message)->toContain('Incomplete guardianship details');
});

test('resubmitting a registration notifies the institute coordinators', function () {
    Mail::fake();

    $institute = notificationInstitute();
    $program = notificationProgram($institute);
    $coordinator = notificationCoordinator($institute);
    $intern = notificationIntern($institute, $program, [
        'status' => 'rejected',
        'rejection_reason' => 'Wrong program',
        'reviewed_by' => $coordinator->id,
        'reviewed_at' => now(),
    ]);
    Location::create([
        'user_id' => $intern->id,
        'region' => '10',
        'province' => 'Misamis Occidental',
        'city_municipality' => 'Tangub City',
        'barangay' => 'Mantic',
        'status' => 'active',
    ]);

    $this->actingAs($intern, 'api')
        ->postJson('/api/my-registration/resubmit', [
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
            'region' => '10',
            'province' => 'Misamis Occidental',
            'city_municipality' => 'Tangub City',
            'barangay' => 'Mantic',
        ])
        ->assertOk();

    $notification = UserNotification::where('user_id', $coordinator->id)->first();

    expect($notification)->not->toBeNull();
    expect($notification->type)->toBe('registration_resubmitted');
    expect($notification->data)->toMatchArray(['uuid' => $intern->uuid]);
});

test('resubmitting does not notify coordinators of other institutes', function () {
    Mail::fake();

    $institute = notificationInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = notificationProgram($institute);
    $otherProgram = Program::create(['institute_id' => $otherInstitute->id, 'name' => 'BS Education']);
    $otherCoordinator = notificationCoordinator($otherInstitute);
    $intern = notificationIntern($institute, $program, [
        'status' => 'rejected',
        'rejection_reason' => 'Wrong program',
        'reviewed_by' => $otherCoordinator->id,
        'reviewed_at' => now(),
    ]);
    Location::create([
        'user_id' => $intern->id,
        'region' => '10',
        'province' => 'Misamis Occidental',
        'city_municipality' => 'Tangub City',
        'barangay' => 'Mantic',
        'status' => 'active',
    ]);

    $this->actingAs($intern, 'api')
        ->postJson('/api/my-registration/resubmit', [
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
            'region' => '10',
            'province' => 'Misamis Occidental',
            'city_municipality' => 'Tangub City',
            'barangay' => 'Mantic',
        ])
        ->assertOk();

    expect(UserNotification::where('user_id', $otherCoordinator->id)->count())->toBe(0);
});
