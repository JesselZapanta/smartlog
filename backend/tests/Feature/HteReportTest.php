<?php

use App\Models\AcademicTerm;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Issue;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function hrInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function hrProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function hrTerm(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(['code' => '251'], ['description' => 'First Semester', 'status' => 'active']);
}

function hrHte(Institute $institute, Program $program, string $name = 'City Hall'): Hte
{
    $user = User::factory()->create([
        'role' => 'hte',
        'firstname' => 'Ana',
        'middlename' => null,
        'lastname' => 'Reyes',
        'extension' => null,
    ]);
    $hte = Hte::create([
        'user_id' => $user->id,
        'name' => $name,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    return $hte->load('user');
}

function hrIntern(Institute $institute, Program $program, Hte $hte, string $name = 'Santos Juan'): Intern
{
    $parts = explode(' ', $name);
    $user = User::factory()->create([
        'role' => 'intern',
        'firstname' => $parts[0],
        'middlename' => null,
        'lastname' => $parts[1] ?? 'Intern',
        'extension' => null,
    ]);
    $intern = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => hrTerm()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hte->id,
        'ojt_status' => 'ongoing',
    ]);

    return $intern->load('user');
}

function hrIssue(Intern $intern, Hte $hte, string $type, string $text, ?string $solutions = null, ?string $recommendations = null, string $status = 'pending'): Issue
{
    return Issue::create([
        'intern_id' => $intern->id,
        'hte_id' => $hte->id,
        'type' => $type,
        'issues' => $text,
        'solutions' => $solutions,
        'recommendations' => $recommendations,
        'status' => $status,
    ]);
}

test('hte report exposes annex c rows with full text for every concern', function () {
    $institute = hrInstitute();
    $program = hrProgram($institute);
    $hte = hrHte($institute, $program, 'City Hall');
    $intern = hrIntern($institute, $program, $hte);

    hrIssue($intern, $hte, 'hte', 'Unresponsive on the phone.', 'Called the supervisor directly.', 'Set a callback schedule.', 'resolve');
    hrIssue($intern, $hte, 'intern', 'Late attendance.');

    $this->actingAs($hte->user, 'api')
        ->getJson('/api/hte/reports')
        ->assertOk()
        ->assertJsonCount(2, 'data.issues.rows')
        ->assertJsonPath('data.issues.rows.0.student', 'Santos Juan')
        ->assertJsonPath('data.issues.rows.0.hte', 'City Hall')
        ->assertJsonPath('data.issues.rows.0.direction', 'HTE')
        ->assertJsonPath('data.issues.rows.0.issues', 'Unresponsive on the phone.')
        ->assertJsonPath('data.issues.rows.0.solutions', 'Called the supervisor directly.')
        ->assertJsonPath('data.issues.rows.0.recommendations', 'Set a callback schedule.')
        ->assertJsonPath('data.issues.rows.1.direction', 'Intern')
        ->assertJsonPath('data.issues.rows.1.issues', 'Late attendance.');
});

test('hte report annex c rows are not truncated', function () {
    $institute = hrInstitute();
    $program = hrProgram($institute);
    $hte = hrHte($institute, $program);
    $intern = hrIntern($institute, $program, $hte);

    $long = str_repeat('A detailed concern spanning many words. ', 10);
    hrIssue($intern, $hte, 'intern', $long);

    $rows = $this->actingAs($hte->user, 'api')->getJson('/api/hte/reports')->json('data.issues.rows');

    expect(strlen($rows[0]['issues']))->toBe(strlen($long))
        ->and($rows[0]['issues'])->toBe($long);
});

test('hte report payload carries the contact name and program for the annex header', function () {
    $institute = hrInstitute();
    $program = hrProgram($institute);
    $hte = hrHte($institute, $program, 'City Hall');

    $this->actingAs($hte->user, 'api')
        ->getJson('/api/hte/reports')
        ->assertOk()
        ->assertJsonPath('data.hte.name', 'City Hall')
        ->assertJsonPath('data.hte.contact_name', 'Ana Reyes')
        ->assertJsonPath('data.hte.program', 'BS Computer Science');
});

test('hte report combines intern and hte concerns in the counts', function () {
    $institute = hrInstitute();
    $program = hrProgram($institute);
    $hte = hrHte($institute, $program);
    $intern = hrIntern($institute, $program, $hte);

    hrIssue($intern, $hte, 'intern', 'One.');
    hrIssue($intern, $hte, 'intern', 'Two.', null, null, 'resolve');
    hrIssue($intern, $hte, 'hte', 'Three.');

    $this->actingAs($hte->user, 'api')
        ->getJson('/api/hte/reports')
        ->assertOk()
        ->assertJsonPath('data.issues.total', 3)
        ->assertJsonPath('data.issues.by_type.intern', 2)
        ->assertJsonPath('data.issues.by_type.hte', 1)
        ->assertJsonPath('data.issues.by_status.pending', 2)
        ->assertJsonPath('data.issues.by_status.resolve', 1);
});

test('concerns for interns at another establishment stay hidden from the hte report', function () {
    $institute = hrInstitute();
    $program = hrProgram($institute);
    $hte = hrHte($institute, $program, 'City Hall');
    $otherHte = hrHte($institute, $program, 'Provincial Office');
    $otherIntern = hrIntern($institute, $program, $otherHte);

    hrIssue($otherIntern, $otherHte, 'intern', 'Not mine.');

    $this->actingAs($hte->user, 'api')
        ->getJson('/api/hte/reports')
        ->assertOk()
        ->assertJsonPath('data.issues.total', 0)
        ->assertJsonCount(0, 'data.issues.rows');
});

test('an hte without a linked record gets an empty payload including annex rows', function () {
    $user = User::factory()->create(['role' => 'hte']);

    $this->actingAs($user, 'api')
        ->getJson('/api/hte/reports')
        ->assertOk()
        ->assertJsonPath('data.hte', null)
        ->assertJsonPath('data.issues.total', 0)
        ->assertJsonCount(0, 'data.issues.rows');
});
