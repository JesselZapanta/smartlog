<?php

use App\Models\Coordinator;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Program;
use App\Models\User;
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
