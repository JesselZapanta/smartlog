<?php

use App\Models\AcademicTerm;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\OjtHour;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\User;
use App\Models\UserNotification;
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

function hteInternCheckedDtr(User $intern, string $date): PhotoDtr
{
    return PhotoDtr::create([
        'intern_id' => $intern->intern->id,
        'dtr_date' => $date,
        'am_in_time' => '08:00:00',
        'am_out_time' => '12:00:00',
        'pm_in_time' => '13:00:00',
        'pm_out_time' => '17:00:00',
        'status' => 'checked',
    ]);
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

test('hte list only includes deployed, hours completed and completed interns', function () {
    $institute = hteInternInstitute();
    $program = hteInternProgram($institute);
    $hte = hteInternHte($institute, $program);
    $hteId = $hte->hte->id;

    hteInternAssigned($institute, $program, $hteId);
    hteInternAssigned($institute, $program, $hteId, [], ['ojt_status' => 'hours_completed']);
    hteInternAssigned($institute, $program, $hteId, [], ['ojt_status' => 'completed']);
    hteInternAssigned($institute, $program, $hteId, [], ['ojt_status' => 'pending']);

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/interns')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.total', 3);
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

test('hte can view an assigned intern who completed their hours', function () {
    $institute = hteInternInstitute();
    $program = hteInternProgram($institute);
    $hte = hteInternHte($institute, $program);
    $intern = hteInternAssigned($institute, $program, $hte->hte->id, [], ['ojt_status' => 'hours_completed']);

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/interns/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.ojt_status', 'hours_completed');
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

test('hte can mark an assigned intern as hours completed once they meet the requirement', function () {
    $institute = hteInternInstitute();
    OjtHour::create(['institute_id' => $institute->id, 'hours' => 10]);
    $program = hteInternProgram($institute);
    $hte = hteInternHte($institute, $program);
    $intern = hteInternAssigned($institute, $program, $hte->hte->id);
    hteInternCheckedDtr($intern, '2026-08-15');
    hteInternCheckedDtr($intern, '2026-08-16');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/complete")
        ->assertOk()
        ->assertJsonPath('data.ojt_status', 'hours_completed')
        ->assertJsonPath('data.end_date', now()->toDateString());

    $record = Intern::where('user_id', $intern->id)->first();
    expect($record->ojt_status)->toBe('hours_completed');
    expect($record->end_date->toDateString())->toBe(now()->toDateString());

    $notification = UserNotification::where('user_id', $intern->id)->first();
    expect($notification->type)->toBe('intern_hours_completed');
});

test('hte cannot mark hours completed before the intern meets the requirement', function () {
    $institute = hteInternInstitute();
    OjtHour::create(['institute_id' => $institute->id, 'hours' => 10]);
    $program = hteInternProgram($institute);
    $hte = hteInternHte($institute, $program);
    $intern = hteInternAssigned($institute, $program, $hte->hte->id);
    hteInternCheckedDtr($intern, '2026-08-15');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/complete")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('hours');

    expect(Intern::where('user_id', $intern->id)->first()->ojt_status)->toBe('ongoing');
});

test('hte cannot mark an intern assigned to another establishment', function () {
    $institute = hteInternInstitute();
    OjtHour::create(['institute_id' => $institute->id, 'hours' => 10]);
    $program = hteInternProgram($institute);
    $hte = hteInternHte($institute, $program);
    $otherHte = hteInternHte($institute, $program);
    $intern = hteInternAssigned($institute, $program, $otherHte->hte->id);
    hteInternCheckedDtr($intern, '2026-08-15');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/complete")
        ->assertForbidden();
});

test('hte cannot mark a non-ongoing intern as hours completed', function () {
    $institute = hteInternInstitute();
    OjtHour::create(['institute_id' => $institute->id, 'hours' => 10]);
    $program = hteInternProgram($institute);
    $hte = hteInternHte($institute, $program);
    $intern = hteInternAssigned($institute, $program, $hte->hte->id, [], ['ojt_status' => 'pending']);

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/interns/{$intern->uuid}/complete")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('ojt_status');
});

test('hte intern module is hte only', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin, 'api')
        ->getJson('/api/hte/interns')
        ->assertForbidden();
});
