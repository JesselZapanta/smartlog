<?php

use App\Models\AcademicTerm;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function instructorInternInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function instructorInternProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function instructorInternAcademicYear(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(
        ['code' => '2025-2026'],
        ['description' => 'First Semester']
    );
}

function instructorInternRecord(Institute $institute, Program $program, array $attributes = [], array $internAttributes = []): User
{
    $user = User::factory()->create(['role' => 'intern', ...$attributes]);
    Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => instructorInternAcademicYear()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
        ...$internAttributes,
    ]);

    return $user;
}

test('instructor sees deployed, hours completed and completed interns', function () {
    $institute = instructorInternInstitute();
    $program = instructorInternProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);

    instructorInternRecord($institute, $program);
    instructorInternRecord($institute, $program, [], ['ojt_status' => 'hours_completed']);
    instructorInternRecord($institute, $program, [], ['ojt_status' => 'pending']);
    instructorInternRecord($institute, $program, [], ['ojt_status' => 'completed']);

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/interns')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.total', 3);
});

test('instructor can search and filter deployed interns by academic year', function () {
    $institute = instructorInternInstitute();
    $program = instructorInternProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);

    $juan = instructorInternRecord($institute, $program, [
        'firstname' => 'Juan',
        'lastname' => 'Dela Cruz',
        'email' => 'juan@example.com',
    ]);
    instructorInternRecord($institute, $program, [
        'firstname' => 'Maria',
        'lastname' => 'Santos',
        'email' => 'maria@example.com',
    ]);

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/interns?search=juan')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.uuid', $juan->uuid);

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/interns?academic_year_id='.instructorInternAcademicYear()->id)
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

test('instructor can view a deployed intern detail', function () {
    $institute = instructorInternInstitute();
    $program = instructorInternProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);

    $hteUser = User::factory()->create(['role' => 'hte']);
    $hte = Hte::create([
        'user_id' => $hteUser->id,
        'name' => 'City Hall',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    $intern = instructorInternRecord($institute, $program, [], ['assigned_hte' => $hte->id]);

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/interns/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.uuid', $intern->uuid)
        ->assertJsonPath('data.ojt_status', 'ongoing')
        ->assertJsonPath('data.hte.name', 'City Hall')
        ->assertJsonPath('data.hte.status', 'active');
});

test('instructor can view an intern who completed their hours', function () {
    $institute = instructorInternInstitute();
    $program = instructorInternProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $intern = instructorInternRecord($institute, $program, [], ['ojt_status' => 'hours_completed']);

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/interns/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.ojt_status', 'hours_completed');
});

test('instructor can view a completed intern detail', function () {
    $institute = instructorInternInstitute();
    $program = instructorInternProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $intern = instructorInternRecord($institute, $program, [], ['ojt_status' => 'completed']);

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/interns/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.ojt_status', 'completed');
});

test('instructor cannot view a non-deployed intern', function () {
    $institute = instructorInternInstitute();
    $program = instructorInternProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $intern = instructorInternRecord($institute, $program, [], ['ojt_status' => 'pending']);

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/interns/{$intern->uuid}")
        ->assertNotFound();
});

test('instructor intern module is instructor only', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin, 'api')
        ->getJson('/api/instructor/interns')
        ->assertForbidden();
});
