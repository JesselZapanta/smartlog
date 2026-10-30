<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\OjtEnrollment;
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

/**
 * Put an approved enrollment application on the intern's term, as the OJT enrollment
 * module does. `ojt_enrollments.ojt_hours` is the single source of the requirement.
 */
function internOjtHoursDeclare(User $intern, int $hours, ?AcademicTerm $term = null): OjtEnrollment
{
    $record = $intern->intern;
    $term ??= $record->academicYear;

    return OjtEnrollment::create([
        'user_id' => $intern->id,
        'academic_year_id' => $term->id,
        'institute_id' => $record->institute_id,
        'program_id' => $record->program_id,
        'ojt_hours' => $hours,
        'status' => 'approved',
    ]);
}

test('intern ojt hours summary includes the declared hours and checked dtr minutes', function () {
    $institute = internOjtHoursInstitute();
    $program = internOjtHoursProgram($institute);
    $intern = internOjtHoursIntern($institute, $program);

    internOjtHoursDeclare($intern, 300);

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

test('the requirement is null when the intern has not applied for ojt enrollment', function () {
    $institute = internOjtHoursInstitute();
    $program = internOjtHoursProgram($institute);
    $intern = internOjtHoursIntern($institute, $program);

    // Registered, but no OJT enrollment application — nothing has been declared.
    expect($intern->intern->requiredHours())->toBeNull();

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/ojt-hours')
        ->assertOk()
        ->assertJsonPath('data.required_hours', null)
        ->assertJsonPath('data.earned_minutes', 0);
});

test('an enrollment without a declared figure has no requirement', function () {
    $institute = internOjtHoursInstitute();
    $program = internOjtHoursProgram($institute);
    $intern = internOjtHoursIntern($institute, $program);

    // The application exists but never carried a number, so there is still nothing to
    // measure against. Zero must not be read as "no hours required".
    internOjtHoursDeclare($intern, 0);

    expect($intern->intern->requiredHours())->toBeNull();
});

test('each term resolves its own declared hours', function () {
    $institute = internOjtHoursInstitute();
    $program = internOjtHoursProgram($institute);
    $intern = internOjtHoursIntern($institute, $program);

    $firstTerm = $intern->intern->academicYear;
    $secondTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);

    $second = Intern::create([
        'user_id' => $intern->id,
        'academic_year_id' => $secondTerm->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_status' => 'ongoing',
    ]);
    $second->forceFill(['status' => 'approved'])->save();

    // Curricula differ, so the two terms legitimately carry different requirements.
    internOjtHoursDeclare($intern, 600, $firstTerm);
    internOjtHoursDeclare($intern, 450, $secondTerm);

    expect($intern->intern->requiredHours())->toBe(600)
        ->and($second->requiredHours())->toBe(450);
});

test('the hte hours gate accepts the declared figure', function () {
    $institute = internOjtHoursInstitute();
    $program = internOjtHoursProgram($institute);
    $intern = internOjtHoursIntern($institute, $program);
    $hteUser = User::factory()->create(['role' => 'hte']);

    $hte = Hte::create([
        'user_id' => $hteUser->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'name' => 'City Hall',
        'status' => 'active',
    ]);

    $intern->intern->forceFill(['assigned_hte' => $hte->id])->save();
    internOjtHoursDeclare($intern, 4);

    $dtr = internOjtHoursDtr($intern, '2026-01-05');
    $dtr->forceFill(['status' => 'checked'])->save();

    $this->actingAs($hteUser, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/complete")
        ->assertOk()
        ->assertJsonPath('data.ojt_status', 'hours_completed');
});

test('the hte hours gate refuses an intern with no ojt enrollment', function () {
    $institute = internOjtHoursInstitute();
    $program = internOjtHoursProgram($institute);
    $intern = internOjtHoursIntern($institute, $program);
    $hteUser = User::factory()->create(['role' => 'hte']);

    $hte = Hte::create([
        'user_id' => $hteUser->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'name' => 'City Hall',
        'status' => 'active',
    ]);

    $intern->intern->forceFill(['assigned_hte' => $hte->id])->save();

    // Plenty of checked time, but no declared requirement to complete.
    $dtr = internOjtHoursDtr($intern, '2026-01-05');
    $dtr->forceFill(['status' => 'checked'])->save();

    $this->actingAs($hteUser, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/complete")
        ->assertStatus(422)
        ->assertJsonValidationErrors(['hours'])
        ->assertJsonPath('errors.hours.0', 'This intern has no OJT enrollment for this term, so there are no required hours to complete.');

    expect($intern->intern->refresh()->ojt_status)->toBe('ongoing');
});

test('the grade table reports hours against the declared figure', function () {
    $institute = internOjtHoursInstitute();
    $program = internOjtHoursProgram($institute);
    $intern = internOjtHoursIntern($institute, $program);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);

    Coordinator::create([
        'user_id' => $instructor->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    internOjtHoursDeclare($intern, 486);

    $response = $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades')
        ->assertOk();

    expect($response->json('data.0.required_hours'))->toBe(486);
});

test('the grade table reports a null requirement for an intern who has not applied', function () {
    $institute = internOjtHoursInstitute();
    $program = internOjtHoursProgram($institute);
    $intern = internOjtHoursIntern($institute, $program);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);

    Coordinator::create([
        'user_id' => $instructor->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    $response = $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-grades')
        ->assertOk();

    expect($response->json('data.0.required_hours'))->toBeNull()
        ->and($response->json('data.0.hours_met'))->toBeFalse();
});
