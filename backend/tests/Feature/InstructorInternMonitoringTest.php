<?php

use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function instructorRecordInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function instructorRecordProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function instructorRecordAcademicYear(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(
        ['code' => '2025-2026'],
        ['description' => 'First Semester']
    );
}

function instructorRecordIntern(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'intern']);
    Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => instructorRecordAcademicYear()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'approved',
        'ojt_status' => 'ongoing',
    ]);

    return $user;
}

function instructorRecordDtr(User $intern, string $date): PhotoDtr
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

function instructorRecordJournal(User $intern, string $date): DailyJournal
{
    return DailyJournal::create([
        'intern_id' => $intern->intern->id,
        'date' => $date,
        'title' => 'Day at the office',
        'journal' => 'Assisted with the inventory system.',
        'status' => 'pending',
    ]);
}

test('instructor approve and reject notify the intern', function () {
    $institute = instructorRecordInstitute();
    $program = instructorRecordProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $intern = instructorRecordIntern($institute, $program);

    instructorRecordJournal($intern, '2026-08-15');

    $this->actingAs($instructor, 'api')
        ->postJson("/api/instructor/interns/{$intern->uuid}/monitoring/approve", [
            'type' => 'journal',
            'date' => '2026-08-15',
        ])
        ->assertOk();

    expect(UserNotification::where('user_id', $intern->id)->where('type', 'journal_approved')->count())->toBe(1);

    $this->actingAs($instructor, 'api')
        ->postJson("/api/instructor/interns/{$intern->uuid}/monitoring/reject", [
            'type' => 'journal',
            'date' => '2026-08-15',
            'remarks' => 'Needs revision.',
        ])
        ->assertOk();

    expect(UserNotification::where('user_id', $intern->id)->where('type', 'journal_rejected')->count())->toBe(1);
});

test('instructor can view a deployed interns records for a month', function () {
    $institute = instructorRecordInstitute();
    $program = instructorRecordProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $intern = instructorRecordIntern($institute, $program);

    instructorRecordDtr($intern, '2026-08-15');
    instructorRecordJournal($intern, '2026-08-15');

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/interns/{$intern->uuid}/monitoring?month=2026-08")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonCount(1, 'dtr')
        ->assertJsonPath('data.0.date', '2026-08-15')
        ->assertJsonPath('dtr.0.dtr_date', '2026-08-15');
});

test('instructor can approve a journal and a photo dtr record', function () {
    $institute = instructorRecordInstitute();
    $program = instructorRecordProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $intern = instructorRecordIntern($institute, $program);

    instructorRecordDtr($intern, '2026-08-15');
    instructorRecordJournal($intern, '2026-08-15');

    $this->actingAs($instructor, 'api')
        ->postJson("/api/instructor/interns/{$intern->uuid}/monitoring/approve", [
            'type' => 'journal',
            'date' => '2026-08-15',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'checked');

    $this->actingAs($instructor, 'api')
        ->postJson("/api/instructor/interns/{$intern->uuid}/monitoring/approve", [
            'type' => 'dtr',
            'date' => '2026-08-15',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'checked');

    expect(DailyJournal::first()->status)->toBe('checked');
    expect(PhotoDtr::first()->status)->toBe('checked');
});

test('instructor can reject a record with remarks', function () {
    $institute = instructorRecordInstitute();
    $program = instructorRecordProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $intern = instructorRecordIntern($institute, $program);

    instructorRecordJournal($intern, '2026-08-15');

    $this->actingAs($instructor, 'api')
        ->postJson("/api/instructor/interns/{$intern->uuid}/monitoring/reject", [
            'type' => 'journal',
            'date' => '2026-08-15',
            'remarks' => 'Missing details in the journal.',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.remarks', 'Missing details in the journal.');

    expect(DailyJournal::first()->status)->toBe('rejected');
});

test('instructor can reject a record that was already flagged by the hte', function () {
    $institute = instructorRecordInstitute();
    $program = instructorRecordProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $intern = instructorRecordIntern($institute, $program);

    $journal = instructorRecordJournal($intern, '2026-08-15');
    $journal->forceFill(['status' => 'flagged', 'remarks' => 'HTE found an issue.'])->save();

    $this->actingAs($instructor, 'api')
        ->postJson("/api/instructor/interns/{$intern->uuid}/monitoring/reject", [
            'type' => 'journal',
            'date' => '2026-08-15',
            'remarks' => 'Final rejection.',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.remarks', 'Final rejection.');

    expect(DailyJournal::first()->status)->toBe('rejected');
});

test('instructor cannot view records of a non-deployed intern', function () {
    $institute = instructorRecordInstitute();
    $program = instructorRecordProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $intern = instructorRecordIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'completed']);

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/interns/{$intern->uuid}/monitoring?month=2026-08")
        ->assertNotFound();
});
