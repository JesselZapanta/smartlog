<?php

use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function hteRecordInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function hteRecordProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function hteRecordAcademicYear(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(
        ['code' => '2025-2026'],
        ['description' => 'First Semester']
    );
}

function hteRecordHte(Institute $institute, Program $program): User
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

function hteRecordIntern(Institute $institute, Program $program, int $hteId): User
{
    $user = User::factory()->create(['role' => 'intern']);
    Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => hteRecordAcademicYear()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hteId,
        'ojt_status' => 'ongoing',
    ]);

    return $user;
}

function hteRecordDtr(User $intern, string $date): PhotoDtr
{
    return PhotoDtr::create([
        'intern_id' => $intern->intern->id,
        'dtr_date' => $date,
        'am_in_time' => '08:00:00',
        'am_out_time' => '12:00:00',
        'pm_in_time' => '13:00:00',
        'pm_out_time' => '17:00:00',
        'status' => 'pending',
    ]);
}

function hteRecordJournal(User $intern, string $date): DailyJournal
{
    return DailyJournal::create([
        'intern_id' => $intern->intern->id,
        'date' => $date,
        'title' => 'Day at the office',
        'journal' => 'Assisted with the inventory system.',
        'status' => 'pending',
    ]);
}

test('hte intern list includes journal stats', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    hteRecordJournal($intern, '2026-08-15');
    hteRecordJournal($intern, '2026-08-16')->forceFill(['status' => 'verified'])->save();
    hteRecordJournal($intern, '2026-08-17')->forceFill(['status' => 'flagged'])->save();

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/interns')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.journals_count', 3)
        ->assertJsonPath('data.0.journals_verified_count', 1)
        ->assertJsonPath('data.0.journals_flagged_count', 1)
        ->assertJsonPath('data.0.journals_unchecked_count', 1);
});

test('hte verify and flag notify the instructors', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    hteRecordJournal($intern, '2026-08-15');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/monitoring/verify", [
            'type' => 'journal',
            'date' => '2026-08-15',
        ])
        ->assertOk();

    expect(UserNotification::where('user_id', $instructor->id)->where('type', 'journal_verified')->count())->toBe(1);

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/monitoring/flag", [
            'type' => 'journal',
            'date' => '2026-08-15',
            'remarks' => 'Please fix this.',
        ])
        ->assertOk();

    expect(UserNotification::where('user_id', $instructor->id)->where('type', 'journal_flagged')->count())->toBe(1);
});

test('hte can view an assigned interns dtr and journal records for a month', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    hteRecordDtr($intern, '2026-08-15');
    hteRecordJournal($intern, '2026-08-15');

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/interns/{$intern->uuid}/monitoring?month=2026-08")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonCount(1, 'dtr')
        ->assertJsonPath('data.0.date', '2026-08-15')
        ->assertJsonPath('data.0.title', 'Day at the office')
        ->assertJsonPath('dtr.0.dtr_date', '2026-08-15')
        ->assertJsonPath('dtr.0.slots.am_in.time', '08:00:00');
});

test('hte can view an assigned interns records for a specific date', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    hteRecordDtr($intern, '2026-08-16');

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/interns/{$intern->uuid}/monitoring?date=2026-08-16")
        ->assertOk()
        ->assertJsonPath('data', null)
        ->assertJsonPath('dtr.dtr_date', '2026-08-16');
});

test('hte can verify a journal and a photo dtr record', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    hteRecordDtr($intern, '2026-08-15');
    hteRecordJournal($intern, '2026-08-15');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/monitoring/verify", [
            'type' => 'journal',
            'date' => '2026-08-15',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'verified');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/monitoring/verify", [
            'type' => 'dtr',
            'date' => '2026-08-15',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'verified')
        ->assertJsonPath('data.verified_by', $hte->full_name);

    expect(DailyJournal::first()->status)->toBe('verified');
    expect(PhotoDtr::first()->status)->toBe('verified');
});

test('hte can flag a record with remarks', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    hteRecordDtr($intern, '2026-08-15');
    hteRecordJournal($intern, '2026-08-15');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/monitoring/flag", [
            'type' => 'dtr',
            'date' => '2026-08-15',
            'remarks' => 'Missing afternoon punch photo.',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'flagged')
        ->assertJsonPath('data.remarks', 'Missing afternoon punch photo.');

    expect(PhotoDtr::first()->status)->toBe('flagged');
    expect(PhotoDtr::first()->remarks)->toBe('Missing afternoon punch photo.');
});

test('flagging requires remarks', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    hteRecordJournal($intern, '2026-08-15');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/monitoring/flag", [
            'type' => 'journal',
            'date' => '2026-08-15',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('remarks');
});

test('hte cannot verify records of another establishment intern', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $otherHte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $otherHte->hte->id);

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/monitoring/verify", [
            'type' => 'journal',
            'date' => '2026-08-15',
        ])
        ->assertForbidden();
});

test('hte cannot view records of another establishment intern', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $otherHte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $otherHte->hte->id);

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/interns/{$intern->uuid}/monitoring?month=2026-08")
        ->assertForbidden();
});
