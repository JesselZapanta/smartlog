<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Issue;
use App\Models\Program;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function issueInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function issueProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function issueAcademicYear(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(
        ['code' => '2025-2026'],
        ['description' => 'First Semester']
    );
}

function issueHte(Institute $institute, Program $program): User
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

function issueIntern(Institute $institute, Program $program, int $hteId, string $ojtStatus = 'ongoing'): User
{
    $user = User::factory()->create(['role' => 'intern']);
    Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => issueAcademicYear()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hteId,
        'ojt_status' => $ojtStatus,
    ]);

    return $user;
}

function issueCoordinator(Institute $institute, Program $program): User
{
    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $coordinator->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    return $coordinator;
}

test('hte issue list includes reported issues with intern info', function () {
    $institute = issueInstitute();
    $program = issueProgram($institute);
    $hte = issueHte($institute, $program);
    $intern = issueIntern($institute, $program, $hte->hte->id);

    Issue::create([
        'intern_id' => $intern->intern->id,
        'hte_id' => $hte->hte->id,
        'type' => 'hte',
        'issues' => 'Intern arrives late frequently.',
        'status' => 'pending',
    ]);

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/issues')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.issues', 'Intern arrives late frequently.')
        ->assertJsonPath('data.0.intern_name', $intern->full_name)
        ->assertJsonPath('meta.total', 1);
});

test('hte issue list excludes issues from another establishment', function () {
    $institute = issueInstitute();
    $program = issueProgram($institute);
    $hte = issueHte($institute, $program);
    $otherHte = issueHte($institute, $program);
    $intern = issueIntern($institute, $program, $otherHte->hte->id);

    Issue::create([
        'intern_id' => $intern->intern->id,
        'hte_id' => $otherHte->hte->id,
        'type' => 'hte',
        'issues' => 'Foreign issue.',
        'status' => 'pending',
    ]);

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/issues')
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.total', 0);
});

test('hte can report an issue for an assigned intern and notifies coordinators', function () {
    $institute = issueInstitute();
    $program = issueProgram($institute);
    $hte = issueHte($institute, $program);
    $intern = issueIntern($institute, $program, $hte->hte->id);
    $coordinator = issueCoordinator($institute, $program);

    $this->actingAs($hte, 'api')
        ->postJson('/api/hte/issues', [
            'intern_id' => $intern->intern->id,
            'issues' => 'Absent without notice for three days.',
        ])
        ->assertStatus(201);

    expect(Issue::count())->toBe(1);
    $issue = Issue::first();
    expect($issue->status)->toBe('pending');
    expect($issue->type)->toBe('hte');

    $notification = UserNotification::where('user_id', $coordinator->id)->first();
    expect($notification)->not->toBeNull();
    expect($notification->type)->toBe('issue_reported');
});

test('hte cannot report an issue for an intern assigned elsewhere', function () {
    $institute = issueInstitute();
    $program = issueProgram($institute);
    $hte = issueHte($institute, $program);
    $otherHte = issueHte($institute, $program);
    $intern = issueIntern($institute, $program, $otherHte->hte->id);

    $this->actingAs($hte, 'api')
        ->postJson('/api/hte/issues', [
            'intern_id' => $intern->intern->id,
            'issues' => 'Invalid intern.',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('intern_id');

    expect(Issue::count())->toBe(0);
});

test('assignable interns only include interns assigned to the hte', function () {
    $institute = issueInstitute();
    $program = issueProgram($institute);
    $hte = issueHte($institute, $program);
    $otherHte = issueHte($institute, $program);

    $mine = issueIntern($institute, $program, $hte->hte->id);
    issueIntern($institute, $program, $otherHte->hte->id);

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/issues/assignable-interns/options')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $mine->intern->id);
});

test('hte can view the details of their own issue', function () {
    $institute = issueInstitute();
    $program = issueProgram($institute);
    $hte = issueHte($institute, $program);
    $intern = issueIntern($institute, $program, $hte->hte->id);

    $issue = Issue::create([
        'intern_id' => $intern->intern->id,
        'hte_id' => $hte->hte->id,
        'type' => 'hte',
        'issues' => 'Needs a safer workstation.',
        'status' => 'pending',
    ]);

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/issues/{$issue->id}")
        ->assertOk()
        ->assertJsonPath('data.issues', 'Needs a safer workstation.')
        ->assertJsonPath('data.intern_name', $intern->full_name);
});

test('hte cannot view an issue belonging to another establishment', function () {
    $institute = issueInstitute();
    $program = issueProgram($institute);
    $hte = issueHte($institute, $program);
    $otherHte = issueHte($institute, $program);
    $intern = issueIntern($institute, $program, $otherHte->hte->id);

    $issue = Issue::create([
        'intern_id' => $intern->intern->id,
        'hte_id' => $otherHte->hte->id,
        'type' => 'hte',
        'issues' => 'Foreign issue.',
        'status' => 'pending',
    ]);

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/issues/{$issue->id}")
        ->assertStatus(403);
});
