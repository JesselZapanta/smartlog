<?php

use App\Models\AcademicTerm;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function hteInternInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function hteInternProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function hteInternAcademicYear(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(
        ['code' => '2025-2026'],
        ['description' => 'First Semester']
    );
}

function hteInternHte(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'hte']);
    Hte::create([
        'user_id' => $user->id,
        'name' => 'City Hall',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    return $user;
}

function hteInternAssigned(Institute $institute, Program $program, int $hteId, array $attributes = [], array $internAttributes = []): User
{
    $user = User::factory()->create(['role' => 'intern', ...$attributes]);
    Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => hteInternAcademicYear()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hteId,
        'ojt_status' => 'ongoing',
        ...$internAttributes,
    ]);

    return $user;
}

test('hte can list their assigned interns with search and academic year filter', function () {
    $institute = hteInternInstitute();
    $program = hteInternProgram($institute);
    $hte = hteInternHte($institute, $program);
    $hteId = $hte->hte->id;

    $juan = hteInternAssigned($institute, $program, $hteId, [
        'firstname' => 'Juan',
        'lastname' => 'Dela Cruz',
        'email' => 'juan@example.com',
    ]);
    hteInternAssigned($institute, $program, $hteId, [
        'firstname' => 'Maria',
        'lastname' => 'Santos',
        'email' => 'maria@example.com',
    ]);

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/interns')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 2);

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/interns?search=juan')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $juan->uuid)
        ->assertJsonPath('meta.total', 1);

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/interns?academic_year_id='.hteInternAcademicYear()->id)
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('hte list only includes deployed interns', function () {
    $institute = hteInternInstitute();
    $program = hteInternProgram($institute);
    $hte = hteInternHte($institute, $program);
    $hteId = $hte->hte->id;

    $deployed = hteInternAssigned($institute, $program, $hteId);
    hteInternAssigned($institute, $program, $hteId, [], ['ojt_status' => 'completed']);
    hteInternAssigned($institute, $program, $hteId, [], ['ojt_status' => 'pending']);

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/interns')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $deployed->uuid)
        ->assertJsonPath('meta.total', 1);
});

test('hte can view one of their assigned interns', function () {
    $institute = hteInternInstitute();
    $program = hteInternProgram($institute);
    $hte = hteInternHte($institute, $program);
    $intern = hteInternAssigned($institute, $program, $hte->hte->id);

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/interns/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.uuid', $intern->uuid)
        ->assertJsonPath('data.ojt_status', 'ongoing');
});

test('hte cannot view an intern assigned to another establishment', function () {
    $institute = hteInternInstitute();
    $program = hteInternProgram($institute);
    $hte = hteInternHte($institute, $program);
    $otherHte = hteInternHte($institute, $program);
    $intern = hteInternAssigned($institute, $program, $otherHte->hte->id);

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/interns/{$intern->uuid}")
        ->assertForbidden();
});

test('hte intern module is hte only', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin, 'api')
        ->getJson('/api/hte/interns')
        ->assertForbidden();
});
