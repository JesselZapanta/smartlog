<?php

use App\Models\AcademicTerm;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\OjtHour;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function internOjtHoursInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function internOjtHoursProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function internOjtHoursIntern(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'intern']);
    $record = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_status' => 'ongoing',
    ]);

    $record->forceFill(['status' => 'approved'])->save();

    return $user;
}

function internOjtHoursDtr(User $intern, string $date): PhotoDtr
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

test('intern ojt hours summary includes the institute requirement and checked dtr minutes', function () {
    $institute = internOjtHoursInstitute();
    OjtHour::create(['institute_id' => $institute->id, 'hours' => 300]);
    $program = internOjtHoursProgram($institute);
    $intern = internOjtHoursIntern($institute, $program);

    $checked = internOjtHoursDtr($intern, '2026-08-15');
    $checked->forceFill(['status' => 'checked'])->save();
    $verified = internOjtHoursDtr($intern, '2026-08-16');
    $verified->forceFill(['status' => 'verified'])->save();
    internOjtHoursDtr($intern, '2026-08-17');

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/ojt-hours')
        ->assertOk()
        ->assertJsonPath('data.institute', 'Institute of Computing')
        ->assertJsonPath('data.required_hours', 300)
        ->assertJsonPath('data.earned_minutes', 480);
});

test('intern ojt hours summary is null-safe when the institute has no requirement', function () {
    $institute = internOjtHoursInstitute();
    $program = internOjtHoursProgram($institute);
    $intern = internOjtHoursIntern($institute, $program);

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/ojt-hours')
        ->assertOk()
        ->assertJsonPath('data.required_hours', null)
        ->assertJsonPath('data.earned_minutes', 0);
});
