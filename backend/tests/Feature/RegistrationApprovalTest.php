<?php

use App\Mail\RegistrationApprovalNotification;
use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Location;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function approvalInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function approvalProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function coordinatorUser(Institute $institute): User
{
    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $coordinator->id,
        'institute_id' => $institute->id,
        'program_id' => approvalProgram($institute)->id,
    ]);

    return $coordinator;
}

function pendingIntern(Institute $institute, Program $program, array $attributes = []): User
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

test('registration creates an intern record with pending status', function () {
    AcademicTerm::create(['code' => '2025-2026', 'description' => 'First Semester', 'status' => 'active']);
    $institute = approvalInstitute();
    $program = approvalProgram($institute);

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

    expect(Intern::first()->status)->toBe('pending');
});

test('coordinator sees only pending registrations of their own institute', function () {
    $instituteA = approvalInstitute();
    $instituteB = Institute::create(['name' => 'Institute of Education']);
    $programA = approvalProgram($instituteA);
    $programB = Program::create(['institute_id' => $instituteB->id, 'name' => 'BS Education']);

    pendingIntern($instituteA, $programA);
    pendingIntern($instituteA, $programA);
    pendingIntern($instituteB, $programB);
    pendingIntern($instituteA, $programA, ['status' => 'approved']);

    $this->actingAs(coordinatorUser($instituteA), 'api')
        ->getJson('/api/registrations/pending')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('an unassigned coordinator sees an empty pending list', function () {
    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    pendingIntern($institute, $program);

    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/registrations/pending')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('approving a registration sets approved and notifies the intern', function () {
    Mail::fake();

    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $intern = pendingIntern($institute, $program);

    $this->actingAs(coordinatorUser($institute), 'api')
        ->postJson("/api/registrations/{$intern->uuid}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved');

    $intern->refresh();

    expect($intern->intern->status)->toBe('approved');
    expect($intern->intern->reviewed_by)->not->toBeNull();
    expect($intern->intern->reviewed_at)->not->toBeNull();

    Mail::assertSent(RegistrationApprovalNotification::class, function (RegistrationApprovalNotification $mail) use ($intern) {
        return $mail->hasTo($intern->email) && $mail->approved === true;
    });
});

test('rejecting a registration requires a reason and notifies the intern', function () {
    Mail::fake();

    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $intern = pendingIntern($institute, $program);

    $this->actingAs(coordinatorUser($institute), 'api')
        ->postJson("/api/registrations/{$intern->uuid}/reject", ['reason' => ''])
        ->assertStatus(422)
        ->assertJsonValidationErrors('reason');

    $this->actingAs(coordinatorUser($institute), 'api')
        ->postJson("/api/registrations/{$intern->uuid}/reject", ['reason' => 'Incomplete guardianship details'])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.rejection_reason', 'Incomplete guardianship details');

    $intern->refresh();

    expect($intern->intern->status)->toBe('rejected');
    expect($intern->intern->rejection_reason)->toBe('Incomplete guardianship details');

    Mail::assertSent(RegistrationApprovalNotification::class, function (RegistrationApprovalNotification $mail) use ($intern) {
        return $mail->hasTo($intern->email) && $mail->approved === false && $mail->reason === 'Incomplete guardianship details';
    });
});

test('a non-coordinator cannot review registrations', function () {
    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $intern = pendingIntern($institute, $program);

    $this->actingAs(User::factory()->create(['role' => 'ojt_instructor']), 'api')
        ->postJson("/api/registrations/{$intern->uuid}/approve")
        ->assertStatus(403);
});

test('a coordinator cannot review an intern from another institute', function () {
    $instituteA = approvalInstitute();
    $instituteB = Institute::create(['name' => 'Institute of Education']);
    $programA = approvalProgram($instituteA);
    $programB = Program::create(['institute_id' => $instituteB->id, 'name' => 'BS Education']);

    $intern = pendingIntern($instituteB, $programB);

    $this->actingAs(coordinatorUser($instituteA), 'api')
        ->postJson("/api/registrations/{$intern->uuid}/approve")
        ->assertStatus(403);
});

test('an approved registration cannot be rejected again', function () {
    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $intern = pendingIntern($institute, $program, ['status' => 'approved']);

    $this->actingAs(coordinatorUser($institute), 'api')
        ->postJson("/api/registrations/{$intern->uuid}/reject", ['reason' => 'Changed my mind'])
        ->assertStatus(422);
});

test('a rejected intern can resubmit their registration', function () {
    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $intern = pendingIntern($institute, $program, [
        'status' => 'rejected',
        'rejection_reason' => 'Wrong program',
        'reviewed_by' => coordinatorUser($institute)->id,
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
        ->assertOk()
        ->assertJsonPath('data.intern.status', 'pending');

    $intern->refresh();

    expect($intern->intern->status)->toBe('pending');
    expect($intern->intern->rejection_reason)->toBeNull();
    expect($intern->intern->reviewed_by)->toBeNull();
    expect($intern->intern->reviewed_at)->toBeNull();
    expect($intern->intern->place_of_birth)->toBe('Ozamiz City');
    expect($intern->intern->practicum_instructor)->toBe('Prof. Reyes');
    expect($intern->location->city_municipality)->toBe('Tangub City');
});

test('a rejected intern can resubmit with a replacement COR pdf', function () {
    Storage::fake('public');

    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $intern = pendingIntern($institute, $program, [
        'status' => 'rejected',
        'rejection_reason' => 'Invalid COR',
        'reviewed_by' => coordinatorUser($institute)->id,
        'reviewed_at' => now(),
    ]);
    $oldPath = UploadedFile::fake()->create('old-cor.pdf', 512, 'application/pdf')->store('cor', 'public');
    $intern->intern()->update(['cor_path' => $oldPath]);
    Location::create([
        'user_id' => $intern->id,
        'region' => '10',
        'province' => 'Misamis Occidental',
        'city_municipality' => 'Tangub City',
        'barangay' => 'Mantic',
        'status' => 'active',
    ]);

    $this->actingAs($intern, 'api')
        ->post('/api/my-registration/resubmit', [
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
            'cor' => UploadedFile::fake()->create('new-cor.pdf', 512, 'application/pdf'),
            'region' => '10',
            'province' => 'Misamis Occidental',
            'city_municipality' => 'Tangub City',
            'barangay' => 'Mantic',
        ], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('data.intern.status', 'pending');

    $intern->refresh();

    expect($intern->intern->cor_path)->not->toBe($oldPath);
    Storage::disk('public')->assertExists($intern->intern->cor_path);
    Storage::disk('public')->assertMissing($oldPath);
});

test('only a rejected registration can be resubmitted', function () {
    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $intern = pendingIntern($institute, $program, ['status' => 'pending']);

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
        ->assertStatus(422);
});

test('my-registration returns the intern and location records', function () {
    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $intern = pendingIntern($institute, $program);
    Location::create([
        'user_id' => $intern->id,
        'region' => '10',
        'province' => 'Misamis Occidental',
        'city_municipality' => 'Tangub City',
        'barangay' => 'Mantic',
        'status' => 'active',
    ]);

    $this->actingAs($intern, 'api')
        ->getJson('/api/my-registration')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'intern' => ['status', 'institute_id', 'program_id', 'date_of_birth', 'practicum_instructor'],
                'location' => ['region', 'province', 'city_municipality', 'barangay'],
            ],
        ])
        ->assertJsonPath('data.intern.status', 'pending')
        ->assertJsonPath('data.location.barangay', 'Mantic');
});

test('coordinator dashboard includes pending approvals for their institute', function () {
    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    pendingIntern($institute, $program);
    pendingIntern($institute, $program, ['status' => 'rejected']);

    $this->actingAs(coordinatorUser($institute), 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonCount(1, 'data.pending_approvals')
        ->assertJsonPath('data.pending_approvals.0.program', $program->name);
});

test('intern dashboard exposes registration approval status', function () {
    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $intern = pendingIntern($institute, $program, [
        'status' => 'rejected',
        'rejection_reason' => 'Incomplete details',
    ]);

    $this->actingAs($intern, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.intern.status', 'rejected')
        ->assertJsonPath('data.intern.rejection_reason', 'Incomplete details');
});

test('pending registrations list supports search, status filter, sorting and pagination', function () {
    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $first = pendingIntern($institute, $program);
    $approved = pendingIntern($institute, $program, ['status' => 'approved']);
    $last = pendingIntern($institute, $program);

    $this->actingAs(coordinatorUser($institute), 'api')
        ->getJson('/api/registrations/pending')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('data.0.id', $last->intern->id);

    $this->actingAs(coordinatorUser($institute), 'api')
        ->getJson('/api/registrations/pending?status=approved')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $approved->intern->id);

    $this->actingAs(coordinatorUser($institute), 'api')
        ->getJson('/api/registrations/pending?search='.urlencode($last->email))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $last->intern->id);

    $this->actingAs(coordinatorUser($institute), 'api')
        ->getJson('/api/registrations/pending?order=asc')
        ->assertOk()
        ->assertJsonPath('data.0.id', $first->intern->id);

    $this->actingAs(coordinatorUser($institute), 'api')
        ->getJson('/api/registrations/pending?per_page=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.per_page', 1)
        ->assertJsonPath('data.0.id', $last->intern->id);
});

test('coordinator can view the full registration detail of their institute', function () {
    $institute = approvalInstitute();
    $program = approvalProgram($institute);
    $intern = pendingIntern($institute, $program);
    Location::create([
        'user_id' => $intern->id,
        'region' => '10',
        'province' => 'Misamis Occidental',
        'city_municipality' => 'Tangub City',
        'barangay' => 'Mantic',
        'status' => 'active',
    ]);

    $this->actingAs(coordinatorUser($institute), 'api')
        ->getJson("/api/registrations/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.uuid', $intern->uuid)
        ->assertJsonPath('data.institute', $institute->name)
        ->assertJsonPath('data.program', $program->name)
        ->assertJsonPath('data.academic_year', 'First Semester')
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.location.barangay', 'Mantic');
});

test('a coordinator cannot view a registration from another institute', function () {
    $instituteA = approvalInstitute();
    $instituteB = Institute::create(['name' => 'Institute of Education']);
    $programB = Program::create(['institute_id' => $instituteB->id, 'name' => 'BS Education']);
    $intern = pendingIntern($instituteB, $programB);

    $this->actingAs(coordinatorUser($instituteA), 'api')
        ->getJson("/api/registrations/{$intern->uuid}")
        ->assertStatus(403);
});
