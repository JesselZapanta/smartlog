<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function coordinatorInternInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function coordinatorInternProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function coordinatorInternCoordinator(Institute $institute): User
{
    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $coordinator->id,
        'institute_id' => $institute->id,
        'program_id' => coordinatorInternProgram($institute)->id,
    ]);

    return $coordinator;
}

function coordinatorInternUser(Institute $institute, Program $program, array $attributes = [], array $userAttributes = []): User
{
    $intern = User::factory()->create(['role' => 'intern', ...$userAttributes]);
    $record = Intern::create([
        'user_id' => $intern->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    $record->forceFill(array_intersect_key($attributes, array_flip([
        'status',
        'academic_year_id',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ])))->save();

    return $intern;
}

test('coordinator sees only approved interns of their institute', function () {
    $institute = coordinatorInternInstitute();
    $program = coordinatorInternProgram($institute);
    $coordinator = coordinatorInternCoordinator($institute);

    $approved = coordinatorInternUser($institute, $program, ['status' => 'approved'], ['email' => 'approved@smartlog.test']);
    coordinatorInternUser($institute, $program, ['status' => 'pending'], ['email' => 'pending@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/registrations/interns')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                ['id', 'uuid', 'full_name', 'email', 'institute', 'program', 'academic_year', 'status', 'created_at'],
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
        ])
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.uuid', $approved->uuid)
        ->assertJsonPath('data.0.status', 'approved');
});

test('coordinator does not see interns from other institutes', function () {
    $institute = coordinatorInternInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = coordinatorInternProgram($institute);
    $coordinator = coordinatorInternCoordinator($institute);

    coordinatorInternUser($otherInstitute, coordinatorInternProgram($otherInstitute), ['status' => 'approved'], ['email' => 'other@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/registrations/interns')
        ->assertOk()
        ->assertJsonPath('meta.total', 0);
});

test('coordinator can search and filter approved interns by academic year', function () {
    $institute = coordinatorInternInstitute();
    $program = coordinatorInternProgram($institute);
    $coordinator = coordinatorInternCoordinator($institute);
    $term = AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester']);
    $otherTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);

    coordinatorInternUser($institute, $program, ['status' => 'approved', 'academic_year_id' => $term->id], ['firstname' => 'Juan', 'middlename' => null, 'lastname' => 'Dela Cruz', 'extension' => null, 'email' => 'juan@smartlog.test']);
    $year2 = coordinatorInternUser($institute, $program, ['status' => 'approved', 'academic_year_id' => $otherTerm->id], ['firstname' => 'Maria', 'middlename' => null, 'lastname' => 'Santos', 'extension' => null, 'email' => 'maria@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/registrations/interns?search=maria')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.full_name', 'Maria Santos');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/registrations/interns?academic_year_id='.$otherTerm->id)
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.uuid', $year2->uuid);
});

test('coordinator can view an approved intern detail of their institute', function () {
    $institute = coordinatorInternInstitute();
    $program = coordinatorInternProgram($institute);
    $coordinator = coordinatorInternCoordinator($institute);
    $intern = coordinatorInternUser($institute, $program, ['status' => 'approved'], ['email' => 'intern@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/registrations/interns/{$intern->uuid}")
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id', 'uuid', 'full_name', 'email', 'institute', 'program', 'academic_year',
                'practicum_instructor', 'cor', 'date_of_birth', 'place_of_birth',
                'fathers_name', 'fathers_occupation', 'fathers_contact', 'mothers_name',
                'mothers_occupation', 'mothers_contact', 'parents_guardian_address', 'location',
                'status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'created_at',
            ],
        ])
        ->assertJsonPath('data.uuid', $intern->uuid);
});

test('coordinator cannot view interns outside their institute', function () {
    $institute = coordinatorInternInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $coordinator = coordinatorInternCoordinator($institute);
    $otherIntern = coordinatorInternUser($otherInstitute, coordinatorInternProgram($otherInstitute), ['status' => 'approved'], ['email' => 'other@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/registrations/interns/{$otherIntern->uuid}")
        ->assertForbidden();
});

test('coordinator intern module is coordinator only', function () {
    $institute = coordinatorInternInstitute();
    $program = coordinatorInternProgram($institute);
    coordinatorInternUser($institute, $program, ['status' => 'approved']);

    $intern = User::factory()->create(['role' => 'intern']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/registrations/interns')
        ->assertForbidden();
});
