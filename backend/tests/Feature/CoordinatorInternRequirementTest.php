<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function irInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function irProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function irCoordinator(Institute $institute): User
{
    $coordinator = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $coordinator->id,
        'institute_id' => $institute->id,
        'program_id' => irProgram($institute)->id,
    ]);

    return $coordinator;
}

function irIntern(Institute $institute, Program $program, array $attributes = []): User
{
    $user = User::factory()->create(['role' => 'intern', ...$attributes]);
    $record = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    $record->forceFill(['status' => 'approved'])->save();

    return $user;
}

function irRequirement(Institute $institute, array $attributes = []): Requirement
{
    return Requirement::create([
        'institute_id' => $institute->id,
        'name' => $attributes['name'] ?? 'Medical Certificate',
        'description' => $attributes['description'] ?? null,
        'type' => $attributes['type'] ?? 'pre_deployment',
        'is_active' => $attributes['is_active'] ?? true,
    ]);
}

function irSubmit(User $intern, Requirement $requirement): void
{
    Storage::fake('public');
    RequirementSubmission::create([
        'user_id' => $intern->id,
        'requirement_id' => $requirement->id,
        'file_path' => UploadedFile::fake()->create('file.pdf', 1024, 'application/pdf')->store('requirement-submissions', 'public'),
    ]);
}

test('coordinator sees interns with submitted/total requirement counts', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);

    $r1 = irRequirement($institute, ['name' => 'Med Cert']);
    $r2 = irRequirement($institute, ['name' => 'MOA']);
    irRequirement($institute, ['name' => 'Inactive', 'is_active' => false]);
    irSubmit($intern, $r1);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-requirements')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                ['id', 'uuid', 'full_name', 'email', 'program', 'ojt_status', 'start_date', 'submitted', 'total'],
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
        ])
        ->assertJsonPath('data.0.ojt_status', 'pending')
        ->assertJsonPath('data.0.submitted', 1)
        ->assertJsonPath('data.0.total', 2);
});

test('list shows ojt status as ongoing once the intern is deployed', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing', 'start_date' => '2026-08-17']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-requirements')
        ->assertOk()
        ->assertJsonPath('data.0.ojt_status', 'ongoing')
        ->assertJsonPath('data.0.start_date', '2026-08-17');
});

test('coordinator does not see interns from other institutes', function () {
    $institute = irInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $coordinator = irCoordinator($institute);
    irIntern($otherInstitute, irProgram($otherInstitute), ['email' => 'other@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-requirements')
        ->assertOk()
        ->assertJsonPath('meta.total', 0);
});

test('coordinator can filter interns by academic year', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $year = AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id;
    $otherYear = AcademicTerm::create(['code' => '2024-2025', 'description' => 'First Semester'])->id;

    irIntern($institute, $program, ['email' => 'current@smartlog.test']);
    $other = irIntern($institute, $program, ['email' => 'other@smartlog.test']);
    Intern::where('user_id', $other->id)->update(['academic_year_id' => $otherYear]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-requirements?academic_year_id='.$year)
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.email', 'current@smartlog.test');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-requirements?academic_year_id='.$otherYear)
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.email', 'other@smartlog.test');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-requirements')
        ->assertOk()
        ->assertJsonPath('meta.total', 2);
});

test('coordinator can view an interns requirement submissions', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);

    $r1 = irRequirement($institute, ['name' => 'Med Cert']);
    $r2 = irRequirement($institute, ['name' => 'MOA']);
    irSubmit($intern, $r1);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-requirements/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.intern.full_name', $intern->full_name)
        ->assertJsonPath('data.submitted', 1)
        ->assertJsonPath('data.total', 2)
        ->assertJsonCount(2, 'data.requirements')
        ->assertJsonStructure([
            'data' => [
                'intern' => ['uuid', 'full_name', 'email', 'program'],
                'submitted', 'total',
                'requirements' => [['id', 'name', 'description', 'type', 'submission']],
            ],
        ])
        ->assertJsonPath('data.requirements.1.submission.id', RequirementSubmission::first()->id);
});

test('coordinator cannot view intern requirements from another institute', function () {
    $institute = irInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $coordinator = irCoordinator($institute);
    $otherIntern = irIntern($otherInstitute, irProgram($otherInstitute), ['email' => 'other@smartlog.test']);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-requirements/{$otherIntern->uuid}")
        ->assertForbidden();
});

test('intern requirements module is coordinator only', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    irRequirement($institute);

    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin, 'api')
        ->getJson('/api/coordinator/intern-requirements')
        ->assertForbidden();
});

test('coordinator can approve an intern requirement submission', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $requirement = irRequirement($institute);
    irSubmit($intern, $requirement);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/{$requirement->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.reviewed_by', $coordinator->full_name);

    $submission = RequirementSubmission::first();
    expect($submission->status)->toBe('approved');
    expect($submission->reviewed_by)->toBe($coordinator->id);
    expect($submission->reviewed_at)->not->toBeNull();

    $notification = UserNotification::where('user_id', $intern->id)->first();
    expect($notification)->not->toBeNull();
    expect($notification->type)->toBe('requirement_approved');
    expect($notification->is_read)->toBeFalse();
});

test('coordinator can reject an intern requirement submission with a reason', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $requirement = irRequirement($institute);
    irSubmit($intern, $requirement);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/{$requirement->id}/reject", [
            'reason' => 'Document is not notarized.',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'rejected')
        ->assertJsonPath('data.rejection_reason', 'Document is not notarized.');

    $submission = RequirementSubmission::first();
    expect($submission->status)->toBe('rejected');
    expect($submission->rejection_reason)->toBe('Document is not notarized.');
    expect($submission->reviewed_by)->toBe($coordinator->id);

    $notification = UserNotification::where('user_id', $intern->id)->first();
    expect($notification)->not->toBeNull();
    expect($notification->type)->toBe('requirement_rejected');
    expect($notification->message)->toContain('Document is not notarized.');
});

test('coordinator cannot approve or reject without a submission', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $requirement = irRequirement($institute);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/{$requirement->id}/approve")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('submission');

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/{$requirement->id}/reject", [
            'reason' => 'Nope',
        ])
        ->assertUnprocessable();
});

test('coordinator cannot approve or reject for another institute', function () {
    $institute = irInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $coordinator = irCoordinator($institute);
    $otherIntern = irIntern($otherInstitute, irProgram($otherInstitute), ['email' => 'other@smartlog.test']);
    $otherRequirement = irRequirement($otherInstitute, ['name' => 'Other Doc']);
    irSubmit($otherIntern, $otherRequirement);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$otherIntern->uuid}/{$otherRequirement->id}/approve")
        ->assertForbidden();
});

test('coordinator can approve all pending submissions of an intern', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $r1 = irRequirement($institute, ['name' => 'Med Cert']);
    $r2 = irRequirement($institute, ['name' => 'MOA']);
    irSubmit($intern, $r1);
    irSubmit($intern, $r2);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/approve-all")
        ->assertOk()
        ->assertJsonPath('data.count', 2);

    expect(RequirementSubmission::where('status', 'approved')->count())->toBe(2);
    expect(RequirementSubmission::where('status', 'pending')->count())->toBe(0);
    expect(UserNotification::where('user_id', $intern->id)->where('type', 'requirement_approved')->count())->toBe(2);
});

test('coordinator can reject all pending submissions of an intern with a reason', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $r1 = irRequirement($institute, ['name' => 'Med Cert']);
    $r2 = irRequirement($institute, ['name' => 'MOA']);
    irSubmit($intern, $r1);
    irSubmit($intern, $r2);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/reject-all", [
            'reason' => 'Documents are outdated.',
        ])
        ->assertOk()
        ->assertJsonPath('data.count', 2);

    expect(RequirementSubmission::where('status', 'rejected')->count())->toBe(2);
    expect(RequirementSubmission::where('status', 'pending')->count())->toBe(0);
    expect(UserNotification::where('user_id', $intern->id)->where('type', 'requirement_rejected')->count())->toBe(2);
});

test('coordinator can deploy an intern once all pre-deployment requirements are approved', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $r1 = irRequirement($institute, ['name' => 'Med Cert']);
    $r2 = irRequirement($institute, ['name' => 'MOA']);
    irSubmit($intern, $r1);
    irSubmit($intern, $r2);
    RequirementSubmission::query()->update(['status' => 'approved']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy", [
            'start_date' => '2026-08-17',
        ])
        ->assertOk()
        ->assertJsonPath('data.ojt_status', 'ongoing')
        ->assertJsonPath('data.start_date', '2026-08-17');

    $record = Intern::where('user_id', $intern->id)->first();
    expect($record->ojt_status)->toBe('ongoing');
    expect($record->start_date->format('Y-m-d'))->toBe('2026-08-17');

    $notification = UserNotification::where('user_id', $intern->id)->first();
    expect($notification->type)->toBe('intern_deployed');
    expect($notification->message)->toContain('2026-08-17');
});

test('coordinator cannot deploy before all requirements are approved', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $r1 = irRequirement($institute, ['name' => 'Med Cert']);
    $r2 = irRequirement($institute, ['name' => 'MOA']);
    irSubmit($intern, $r1);
    irSubmit($intern, $r2);
    RequirementSubmission::first()->update(['status' => 'approved']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy", [
            'start_date' => '2026-08-17',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('requirements');

    expect(Intern::where('user_id', $intern->id)->first()->ojt_status)->toBe('pending');
});

test('coordinator cannot deploy an already deployed intern', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $requirement = irRequirement($institute);
    irSubmit($intern, $requirement);
    RequirementSubmission::query()->update(['status' => 'approved']);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy", [
            'start_date' => '2026-08-17',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('ojt_status');
});

test('coordinator cannot deploy an intern who completed their hours', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $requirement = irRequirement($institute);
    irSubmit($intern, $requirement);
    RequirementSubmission::query()->update(['status' => 'approved']);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'hours_completed']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy", [
            'start_date' => '2026-08-17',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('ojt_status');

    expect(Intern::where('user_id', $intern->id)->first()->ojt_status)->toBe('hours_completed');
});

test('deploy defaults the start date to today', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $requirement = irRequirement($institute);
    irSubmit($intern, $requirement);
    RequirementSubmission::query()->update(['status' => 'approved']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy")
        ->assertOk()
        ->assertJsonPath('data.start_date', now()->toDateString());

    expect(Intern::where('user_id', $intern->id)->first()->start_date->format('Y-m-d'))->toBe(now()->toDateString());
});
