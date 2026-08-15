<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function coordinatorHteInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function coordinatorHteProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function coordinatorHteCoordinator(Institute $institute): User
{
    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $coordinator->id,
        'institute_id' => $institute->id,
        'program_id' => coordinatorHteProgram($institute)->id,
    ]);

    return $coordinator;
}

function coordinatorHteUser(Institute $institute, Program $program, array $attributes = [], array $userAttributes = []): User
{
    $user = User::factory()->create(['role' => 'hte', ...$userAttributes]);
    Hte::create([
        'user_id' => $user->id,
        'name' => $attributes['name'] ?? 'City Hall',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'moa' => null,
        'start_at' => '2026-08-01 00:00:00',
        'end_at' => '2026-12-31 00:00:00',
        'status' => $attributes['status'] ?? 'active',
    ]);

    return $user;
}

test('coordinator sees only htes of their institute', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    coordinatorHteUser($institute, $program, [], ['email' => 'mine@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/htes')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                ['id', 'uuid', 'name', 'contact_person', 'email', 'institute', 'program', 'status', 'created_at'],
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
        ])
        ->assertJsonPath('meta.total', 1);
});

test('coordinator does not see htes from other institutes', function () {
    $institute = coordinatorHteInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $coordinator = coordinatorHteCoordinator($institute);
    coordinatorHteUser($otherInstitute, coordinatorHteProgram($otherInstitute), [], ['email' => 'other@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/htes')
        ->assertOk()
        ->assertJsonPath('meta.total', 0);
});

test('coordinator can search htes by name or contact', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    coordinatorHteUser($institute, $program, ['name' => 'City Hall'], ['email' => 'hall@smartlog.test']);
    coordinatorHteUser($institute, $program, ['name' => 'Rural Health Unit'], ['email' => 'rhu@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/htes?search=rhu')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.name', 'Rural Health Unit');
});

test('coordinator can filter htes by status', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    coordinatorHteUser($institute, $program, ['name' => 'Active Hall'], ['email' => 'active@smartlog.test']);
    coordinatorHteUser($institute, $program, ['name' => 'Closed Hall', 'status' => 'inactive'], ['email' => 'closed@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/htes?status=active')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.name', 'Active Hall');
});

test('coordinator can create an hte account', function () {
    Mail::fake();
    Storage::fake('public');
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);

    $this->actingAs($coordinator, 'api')
        ->postJson('/api/coordinator/htes', [
            'firstname' => 'Liza',
            'lastname' => 'Cruz',
            'email' => 'liza@smartlog.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'name' => 'Tangub City Hall',
            'program_id' => $program->id,
            'start_at' => '2026-08-01',
            'end_at' => '2026-12-31',
            'status' => 'active',
            'region' => '10',
            'province' => 'Misamis Occidental',
            'city_municipality' => 'Tangub City',
            'barangay' => 'Mantic',
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Tangub City Hall')
        ->assertJsonPath('data.status', 'active');

    $user = User::where('email', 'liza@smartlog.test')->first();
    expect($user)->not->toBeNull();
    expect($user->role)->toBe('hte');
    expect($user->email_verified_at)->toBeNull();
    expect($user->hte->institute_id)->toBe($institute->id);
    expect($user->location)->not->toBeNull();
});

test('coordinator can set the hte status on create and validates it', function () {
    Mail::fake();
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);

    $this->actingAs($coordinator, 'api')
        ->postJson('/api/coordinator/htes', [
            'firstname' => 'Liza',
            'lastname' => 'Cruz',
            'email' => 'liza@smartlog.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'name' => 'Tangub City Hall',
            'program_id' => $program->id,
            'status' => 'inactive',
        ])
        ->assertCreated()
        ->assertJsonPath('data.status', 'inactive');

    expect(User::where('email', 'liza@smartlog.test')->first()->hte->status)->toBe('inactive');

    $this->actingAs($coordinator, 'api')
        ->postJson('/api/coordinator/htes', [
            'firstname' => 'Liza',
            'lastname' => 'Cruz',
            'email' => 'bad@smartlog.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'name' => 'Bad Status Hall',
            'program_id' => $program->id,
            'status' => 'suspended',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');
});

test('coordinator cannot create an hte for another institute', function () {
    Mail::fake();
    $institute = coordinatorHteInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = coordinatorHteProgram($institute);
    $otherProgram = Program::create(['institute_id' => $otherInstitute->id, 'name' => 'BS Education']);
    $coordinator = coordinatorHteCoordinator($institute);

    $this->actingAs($coordinator, 'api')
        ->postJson('/api/coordinator/htes', [
            'firstname' => 'Liza',
            'lastname' => 'Cruz',
            'email' => 'liza@smartlog.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'name' => 'Other Institute Partner',
            'program_id' => $otherProgram->id,
        ])
        ->assertUnprocessable();

    expect(User::where('email', 'liza@smartlog.test')->count())->toBe(0);
});

test('coordinator can update an hte of their institute', function () {
    Mail::fake();
    Storage::fake('public');
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hteUser = coordinatorHteUser($institute, $program, [], ['email' => 'hall@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/htes/{$hteUser->uuid}", [
            'firstname' => 'Liza',
            'lastname' => 'Cruz',
            'email' => 'hall@smartlog.test',
            'name' => 'Renamed City Hall',
            'program_id' => $program->id,
            'moa' => UploadedFile::fake()->create('moa.pdf', 1024, 'application/pdf'),
            'start_at' => '2026-08-01',
            'end_at' => '2026-12-31',
            'status' => 'active',
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Renamed City Hall');

    expect($hteUser->refresh()->hte->name)->toBe('Renamed City Hall');
    expect($hteUser->hte->moa)->not->toBeNull();
});

test('coordinator cannot update an hte from another institute', function () {
    $institute = coordinatorHteInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $otherHte = coordinatorHteUser($otherInstitute, coordinatorHteProgram($otherInstitute), [], ['email' => 'other@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/htes/{$otherHte->uuid}", [
            'firstname' => 'X',
            'lastname' => 'Y',
            'email' => 'other@smartlog.test',
            'name' => 'Hacked',
            'program_id' => $program->id,
            'status' => 'active',
        ])
        ->assertForbidden();
});

test('coordinator can delete an hte of their institute', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hteUser = coordinatorHteUser($institute, $program, [], ['email' => 'hall@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->deleteJson("/api/coordinator/htes/{$hteUser->uuid}")
        ->assertOk();

    expect(User::find($hteUser->id))->toBeNull();
});

test('coordinator cannot delete an hte from another institute', function () {
    $institute = coordinatorHteInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $coordinator = coordinatorHteCoordinator($institute);
    $otherHte = coordinatorHteUser($otherInstitute, coordinatorHteProgram($otherInstitute), [], ['email' => 'other@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->deleteJson("/api/coordinator/htes/{$otherHte->uuid}")
        ->assertForbidden();

    expect(User::find($otherHte->id))->not->toBeNull();
});

test('coordinator hte reference returns institute and programs', function () {
    $institute = coordinatorHteInstitute();
    $coordinator = coordinatorHteCoordinator($institute);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/htes/reference')
        ->assertOk()
        ->assertJsonPath('data.institute.id', $institute->id)
        ->assertJsonPath('data.institute.name', 'Institute of Computing')
        ->assertJsonStructure(['data' => ['programs' => [['id', 'name']]]]);
});

test('coordinator hte module is coordinator only', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    coordinatorHteUser($institute, $program);

    $intern = User::factory()->create(['role' => 'intern']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/coordinator/htes')
        ->assertForbidden();
});

function coordinatorHteApprovedIntern(Institute $institute, Program $program, array $userAttributes = []): User
{
    $user = User::factory()->create(['role' => 'intern', ...$userAttributes]);
    $record = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);
    $record->forceFill(['status' => 'approved'])->save();

    return $user;
}

function coordinatorHteAcademicYearId(): int
{
    return AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id;
}

test('hte list includes assigned intern count', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    $intern = coordinatorHteApprovedIntern($institute, $program);

    $hte->hte->assignedInterns()->save(Intern::where('user_id', $intern->id)->first());

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/htes?academic_year_id='.coordinatorHteAcademicYearId())
        ->assertOk()
        ->assertJsonPath('data.0.assigned_count', 1);
});

test('coordinator can list assignable interns for an hte', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    $intern = coordinatorHteApprovedIntern($institute, $program, ['email' => 'intern@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->uuid}/assignable-interns?academic_year_id=".coordinatorHteAcademicYearId())
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $intern->uuid);
});

test('assignable interns can be searched by name or email', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    coordinatorHteApprovedIntern($institute, $program, ['firstname' => 'Juan', 'lastname' => 'Dela Cruz', 'email' => 'juan@smartlog.test']);
    $maria = coordinatorHteApprovedIntern($institute, $program, ['firstname' => 'Maria', 'lastname' => 'Santos', 'email' => 'maria@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->uuid}/assignable-interns?academic_year_id=".coordinatorHteAcademicYearId().'&search=maria')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $maria->uuid);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->uuid}/assignable-interns?academic_year_id=".coordinatorHteAcademicYearId().'&search=juan@smartlog.test')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.email', 'juan@smartlog.test');
});

test('assignable interns are paginated ten at a time', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);

    for ($i = 1; $i <= 12; $i++) {
        coordinatorHteApprovedIntern($institute, $program, ['email' => "intern{$i}@smartlog.test"]);
    }

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->uuid}/assignable-interns?academic_year_id=".coordinatorHteAcademicYearId())
        ->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.total', 12)
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonPath('meta.last_page', 2);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->uuid}/assignable-interns?academic_year_id=".coordinatorHteAcademicYearId().'&page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('already assigned interns are not assignable', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    $intern = coordinatorHteApprovedIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['assigned_hte' => $hte->hte->id]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->uuid}/assignable-interns?academic_year_id=".coordinatorHteAcademicYearId())
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('coordinator can assign interns to an hte', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    $internA = coordinatorHteApprovedIntern($institute, $program, ['email' => 'a@smartlog.test']);
    $internB = coordinatorHteApprovedIntern($institute, $program, ['email' => 'b@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/htes/{$hte->uuid}/assign", [
            'academic_year_id' => coordinatorHteAcademicYearId(),
            'intern_ids' => [$internA->intern->id, $internB->intern->id],
        ])
        ->assertOk()
        ->assertJsonPath('data.count', 2);

    expect(Intern::where('assigned_hte', $hte->hte->id)->count())->toBe(2);
});

test('assigning interns notifies each intern', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    $internA = coordinatorHteApprovedIntern($institute, $program, ['email' => 'a@smartlog.test']);
    $internB = coordinatorHteApprovedIntern($institute, $program, ['email' => 'b@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/htes/{$hte->uuid}/assign", [
            'academic_year_id' => coordinatorHteAcademicYearId(),
            'intern_ids' => [$internA->intern->id, $internB->intern->id],
        ])
        ->assertOk();

    foreach ([$internA, $internB] as $intern) {
        $notification = UserNotification::where('user_id', $intern->id)->first();
        expect($notification)->not->toBeNull();
        expect($notification->type)->toBe('hte_assigned');
        expect($notification->title)->toBe('Assigned to an HTE');
        expect($notification->message)->toContain('City Hall');
        expect($notification->is_read)->toBeFalse();
    }
});

test('only interns of the selected academic year are assignable', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    $year = coordinatorHteAcademicYearId();
    $otherYear = AcademicTerm::create(['code' => '2024-2025', 'description' => 'First Semester'])->id;

    $current = coordinatorHteApprovedIntern($institute, $program, ['email' => 'current@smartlog.test']);
    $other = coordinatorHteApprovedIntern($institute, $program, ['email' => 'other@smartlog.test']);
    Intern::where('user_id', $other->id)->update(['academic_year_id' => $otherYear]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->uuid}/assignable-interns?academic_year_id={$year}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $current->uuid);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/htes/{$hte->uuid}/assign", [
            'academic_year_id' => $year,
            'intern_ids' => [$current->intern->id, $other->intern->id],
        ])
        ->assertOk()
        ->assertJsonPath('data.count', 1);
});

test('assignable interns require an academic year', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    coordinatorHteApprovedIntern($institute, $program);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->uuid}/assignable-interns")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('academic_year_id');
});

test('coordinator cannot assign interns from another institute', function () {
    $institute = coordinatorHteInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    $otherIntern = coordinatorHteApprovedIntern($otherInstitute, coordinatorHteProgram($otherInstitute), ['email' => 'other@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/htes/{$hte->uuid}/assign", [
            'academic_year_id' => coordinatorHteAcademicYearId(),
            'intern_ids' => [$otherIntern->intern->id],
        ])
        ->assertOk()
        ->assertJsonPath('data.count', 0);

    expect(Intern::where('assigned_hte', $hte->hte->id)->count())->toBe(0);
});

test('coordinator can list interns assigned to an hte', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    $intern = coordinatorHteApprovedIntern($institute, $program, ['email' => 'assigned@smartlog.test']);

    Intern::where('user_id', $intern->id)->update(['assigned_hte' => $hte->hte->id]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->uuid}/assigned-interns?academic_year_id=".coordinatorHteAcademicYearId())
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $intern->uuid);

    expect($intern->intern->refresh()->assigned_hte)->toBe($hte->hte->id);
});

test('assigned interns list requires an academic year', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/htes/{$hte->uuid}/assigned-interns")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('academic_year_id');
});

test('coordinator can unassign interns from an hte', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    $intern = coordinatorHteApprovedIntern($institute, $program, ['email' => 'assigned@smartlog.test']);

    Intern::where('user_id', $intern->id)->update(['assigned_hte' => $hte->hte->id]);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/htes/{$hte->uuid}/unassign", [
            'academic_year_id' => coordinatorHteAcademicYearId(),
            'intern_ids' => [$intern->intern->id],
        ])
        ->assertOk()
        ->assertJsonPath('data.count', 1);

    expect(Intern::where('user_id', $intern->id)->first()->assigned_hte)->toBeNull();
});

test('coordinator cannot unassign interns from another institute', function () {
    $institute = coordinatorHteInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $otherHte = coordinatorHteUser($otherInstitute, coordinatorHteProgram($otherInstitute), ['name' => 'Other Hall']);
    $otherIntern = coordinatorHteApprovedIntern($otherInstitute, coordinatorHteProgram($otherInstitute), ['email' => 'other@smartlog.test']);
    Intern::where('user_id', $otherIntern->id)->update(['assigned_hte' => $otherHte->hte->id]);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/htes/{$otherHte->uuid}/unassign", [
            'academic_year_id' => coordinatorHteAcademicYearId(),
            'intern_ids' => [$otherIntern->intern->id],
        ])
        ->assertForbidden();

    expect(Intern::where('user_id', $otherIntern->id)->first()->assigned_hte)->not->toBeNull();
});

test('coordinator cannot unassign interns assigned to another hte', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hteA = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);
    $hteB = coordinatorHteUser($institute, $program, ['name' => 'Rural Health Unit']);
    $intern = coordinatorHteApprovedIntern($institute, $program, ['email' => 'assigned@smartlog.test']);
    Intern::where('user_id', $intern->id)->update(['assigned_hte' => $hteA->hte->id]);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/htes/{$hteB->uuid}/unassign", [
            'academic_year_id' => coordinatorHteAcademicYearId(),
            'intern_ids' => [$intern->intern->id],
        ])
        ->assertOk()
        ->assertJsonPath('data.count', 0);

    expect(Intern::where('user_id', $intern->id)->first()->assigned_hte)->toBe($hteA->hte->id);
});

test('unassign requires an academic year', function () {
    $institute = coordinatorHteInstitute();
    $program = coordinatorHteProgram($institute);
    $coordinator = coordinatorHteCoordinator($institute);
    $hte = coordinatorHteUser($institute, $program, ['name' => 'City Hall']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/htes/{$hte->uuid}/unassign", [
            'intern_ids' => [1],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('academic_year_id');
});
