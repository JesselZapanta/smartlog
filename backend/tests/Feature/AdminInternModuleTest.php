<?php

use App\Models\AcademicTerm;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function internModuleInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function internModuleProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function internModuleAdmin(): User
{
    return User::factory()->create(['role' => 'admin']);
}

function internModuleIntern(Institute $institute, Program $program, array $attributes = [], array $userAttributes = []): User
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

test('admin can list interns with pagination meta', function () {
    $institute = internModuleInstitute();
    $program = internModuleProgram($institute);
    internModuleIntern($institute, $program, ['status' => 'approved']);

    $this->actingAs(internModuleAdmin(), 'api')
        ->getJson('/api/interns')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                ['id', 'uuid', 'full_name', 'email', 'institute', 'program', 'academic_year', 'status', 'created_at'],
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
        ])
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.status', 'approved');
});

test('admin can search interns by name or email', function () {
    $institute = internModuleInstitute();
    $program = internModuleProgram($institute);
    internModuleIntern($institute, $program, ['status' => 'approved'], ['firstname' => 'Juan', 'middlename' => null, 'lastname' => 'Dela Cruz', 'extension' => null, 'email' => 'juan@smartlog.test']);
    internModuleIntern($institute, $program, ['status' => 'approved'], ['firstname' => 'Maria', 'middlename' => null, 'lastname' => 'Santos', 'extension' => null, 'email' => 'maria@smartlog.test']);

    $this->actingAs(internModuleAdmin(), 'api')
        ->getJson('/api/interns?search=maria')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.full_name', 'Maria Santos');
});

test('list shows only approved interns', function () {
    $institute = internModuleInstitute();
    $program = internModuleProgram($institute);
    internModuleIntern($institute, $program, ['status' => 'pending'], ['email' => 'pending@smartlog.test']);
    $approved = internModuleIntern($institute, $program, ['status' => 'approved'], ['email' => 'approved@smartlog.test']);

    $this->actingAs(internModuleAdmin(), 'api')
        ->getJson('/api/interns')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.uuid', $approved->uuid)
        ->assertJsonPath('data.0.status', 'approved');
});

test('admin can filter interns by institute and academic year', function () {
    $institute = internModuleInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = internModuleProgram($institute);
    $term = AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester']);
    $otherTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);

    internModuleIntern($institute, $program, ['status' => 'approved', 'academic_year_id' => $term->id], ['email' => 'year1@smartlog.test']);
    $year2 = internModuleIntern($institute, $program, ['status' => 'approved', 'academic_year_id' => $otherTerm->id], ['email' => 'year2@smartlog.test']);

    $this->actingAs(internModuleAdmin(), 'api')
        ->getJson('/api/interns?institute_id='.$otherInstitute->id)
        ->assertOk()
        ->assertJsonPath('meta.total', 0);

    $this->actingAs(internModuleAdmin(), 'api')
        ->getJson('/api/interns?academic_year_id='.$otherTerm->id)
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.uuid', $year2->uuid);
});

test('admin can view intern details', function () {
    $institute = internModuleInstitute();
    $program = internModuleProgram($institute);
    $intern = internModuleIntern($institute, $program, ['status' => 'approved']);

    $this->actingAs(internModuleAdmin(), 'api')
        ->getJson("/api/interns/{$intern->uuid}")
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id', 'uuid', 'full_name', 'email', 'contact_number', 'institute', 'program',
                'academic_year', 'practicum_instructor', 'cor', 'date_of_birth', 'place_of_birth',
                'fathers_name', 'fathers_occupation', 'fathers_contact', 'mothers_name',
                'mothers_occupation', 'mothers_contact', 'parents_guardian_address', 'location',
                'status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'created_at',
            ],
        ])
        ->assertJsonPath('data.uuid', $intern->uuid)
        ->assertJsonPath('data.institute', 'Institute of Computing');
});

test('intern detail returns 404 for a user without an intern record', function () {
    $user = User::factory()->create(['role' => 'intern']);

    $this->actingAs(internModuleAdmin(), 'api')
        ->getJson("/api/interns/{$user->uuid}")
        ->assertNotFound();
});

test('intern module is admin only', function () {
    $institute = internModuleInstitute();
    $program = internModuleProgram($institute);
    internModuleIntern($institute, $program);

    $intern = User::factory()->create(['role' => 'intern']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/interns')
        ->assertForbidden();
});
