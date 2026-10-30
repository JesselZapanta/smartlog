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

function ciInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function ciProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function ciTerm(string $code = '251', string $description = 'First Semester'): AcademicTerm
{
    return AcademicTerm::firstOrCreate(['code' => $code], ['description' => $description]);
}

function ciHte(Institute $institute, Program $program, string $name = 'City Hall'): Hte
{
    $user = User::factory()->create(['role' => 'hte']);
    $hte = Hte::create([
        'user_id' => $user->id,
        'name' => $name,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    return $hte->load('user');
}

function ciIntern(Institute $institute, Program $program, Hte $hte, string $ojtStatus = 'ongoing'): Intern
{
    $user = User::factory()->create(['role' => 'intern']);
    $intern = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => ciTerm()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hte->id,
        'ojt_status' => $ojtStatus,
    ]);

    return $intern->load('user');
}

function ciCoordinator(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    return $user;
}

function ciIssue(Intern $intern, Hte $hte, string $type, string $text = 'Some concern.', string $status = 'pending'): Issue
{
    return Issue::create([
        'intern_id' => $intern->id,
        'hte_id' => $hte->id,
        'type' => $type,
        'issues' => $text,
        'status' => $status,
    ]);
}

test('intern issues page lists only intern raised concerns', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);

    ciIssue($intern, $hte, 'intern', 'Intern has issue with the HTE.');
    ciIssue($intern, $hte, 'hte', 'HTE has issue with the intern.');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-issues')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.type', 'intern')
        ->assertJsonPath('data.0.issues', 'Intern has issue with the HTE.')
        ->assertJsonPath('meta.total', 1);
});

test('hte issues page lists only hte raised concerns', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);

    ciIssue($intern, $hte, 'intern', 'Intern has issue with the HTE.');
    ciIssue($intern, $hte, 'hte', 'HTE has issue with the intern.');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/hte-issues')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.type', 'hte')
        ->assertJsonPath('data.0.issues', 'HTE has issue with the intern.')
        ->assertJsonPath('meta.total', 1);
});

test('the intern issues page rejects a forged type in the request body', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);

    $this->actingAs($coordinator, 'api')
        ->postJson('/api/coordinator/intern-issues', [
            'intern_id' => $intern->id,
            'type' => 'hte',
            'issues' => 'Attempted cross-type write.',
            'status' => 'pending',
        ])
        ->assertCreated();

    expect(Issue::sole()->type)->toBe('intern');
});

test('the hte issues page rejects a forged type in the request body', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);

    $this->actingAs($coordinator, 'api')
        ->postJson('/api/coordinator/hte-issues', [
            'intern_id' => $intern->id,
            'type' => 'intern',
            'issues' => 'Attempted cross-type write.',
            'status' => 'pending',
        ])
        ->assertCreated();

    expect(Issue::sole()->type)->toBe('hte');
});

test('an hte issue cannot be read through the intern issues endpoint', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);
    $issue = ciIssue($intern, $hte, 'hte');

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-issues/{$issue->id}")
        ->assertNotFound();
});

test('an intern issue cannot be read through the hte issues endpoint', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);
    $issue = ciIssue($intern, $hte, 'intern');

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/hte-issues/{$issue->id}")
        ->assertNotFound();
});

test('an hte issue cannot be updated or deleted through the intern issues endpoint', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);
    $issue = ciIssue($intern, $hte, 'hte', 'Original text.');

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/intern-issues/{$issue->id}", [
            'intern_id' => $intern->id,
            'issues' => 'Tampered.',
            'status' => 'resolve',
        ])
        ->assertNotFound();

    $this->actingAs($coordinator, 'api')
        ->deleteJson("/api/coordinator/intern-issues/{$issue->id}")
        ->assertNotFound();

    $issue->refresh();

    expect($issue->issues)->toBe('Original text.')
        ->and($issue->status)->toBe('pending');
});

test('the coordinator cannot rewrite the reporters issue text', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);
    $issue = ciIssue($intern, $hte, 'intern', 'Original reporter wording.');

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/intern-issues/{$issue->id}", [
            'intern_id' => $intern->id,
            'issues' => 'Coordinator rewrote this.',
            'status' => 'resolve',
        ])
        ->assertOk();

    $issue->refresh();

    expect($issue->issues)->toBe('Original reporter wording.')
        ->and($issue->status)->toBe('resolve');
});

test('the coordinator cannot rewrite the reporters issue text on the hte page', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);
    $issue = ciIssue($intern, $hte, 'hte', 'Original reporter wording.');

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/hte-issues/{$issue->id}", [
            'intern_id' => $intern->id,
            'issues' => 'Coordinator rewrote this.',
            'status' => 'resolve',
        ])
        ->assertOk();

    expect($issue->refresh()->issues)->toBe('Original reporter wording.');
});

test('the coordinator can still update solutions recommendations and status', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);
    $issue = ciIssue($intern, $hte, 'intern', 'Original reporter wording.');

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/intern-issues/{$issue->id}", [
            'intern_id' => $intern->id,
            'solutions' => 'Talked it over with the supervisor.',
            'recommendations' => 'Set a fixed schedule.',
            'status' => 'resolve',
        ])
        ->assertOk();

    $issue->refresh();

    expect($issue->issues)->toBe('Original reporter wording.')
        ->and($issue->solutions)->toBe('Talked it over with the supervisor.')
        ->and($issue->recommendations)->toBe('Set a fixed schedule.')
        ->and($issue->status)->toBe('resolve');
});

test('resolving an intern issue notifies the intern', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);
    $issue = ciIssue($intern, $hte, 'intern');

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/intern-issues/{$issue->id}", [
            'intern_id' => $intern->id,
            'issues' => $issue->issues,
            'status' => 'resolve',
        ])
        ->assertOk();

    expect(UserNotification::where('user_id', $intern->user_id)->where('type', 'issue_resolved')->count())->toBe(1);
});

test('resolving an hte issue notifies the hte', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);
    $issue = ciIssue($intern, $hte, 'hte');

    $this->actingAs($coordinator, 'api')
        ->putJson("/api/coordinator/hte-issues/{$issue->id}", [
            'intern_id' => $intern->id,
            'issues' => $issue->issues,
            'status' => 'resolve',
        ])
        ->assertOk();

    expect(UserNotification::where('user_id', $hte->user_id)->where('type', 'issue_resolved')->count())->toBe(1);
});

test('issues from another institute stay hidden and unreachable', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);

    $otherInstitute = ciInstitute();
    $otherInstitute->update(['name' => 'Institute of Nursing']);
    $otherProgram = ciProgram($otherInstitute);
    $otherHte = ciHte($otherInstitute, $otherProgram, 'Other HTE');
    $otherIntern = ciIntern($otherInstitute, $otherProgram, $otherHte);
    $coordinator = ciCoordinator($institute, $program);
    $issue = ciIssue($otherIntern, $otherHte, 'intern');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-issues')
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.total', 0);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-issues/{$issue->id}")
        ->assertForbidden();
});

test('each page keeps its own search and status filters', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);

    ciIssue($intern, $hte, 'intern', 'Late reporting of attendance.', 'pending');
    ciIssue($intern, $hte, 'intern', 'Broken air conditioning.', 'resolve');
    ciIssue($intern, $hte, 'hte', 'Late reporting of attendance.', 'pending');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-issues?search=attendance')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.issues', 'Late reporting of attendance.');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-issues?status=resolve')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.issues', 'Broken air conditioning.');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/hte-issues?search=air')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('the shared intern options endpoint still serves both forms', function () {
    $institute = ciInstitute();
    $program = ciProgram($institute);
    $hte = ciHte($institute, $program);
    $intern = ciIntern($institute, $program, $hte);
    $coordinator = ciCoordinator($institute, $program);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/issues/interns/options')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $intern->id)
        ->assertJsonPath('data.0.hte_name', $hte->name);
});

test('a coordinator without an institute gets an empty list', function () {
    $user = User::factory()->create(['role' => 'ojt_coordinator']);

    $this->actingAs($user, 'api')
        ->getJson('/api/coordinator/intern-issues')
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.total', 0);
});
