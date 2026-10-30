<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\PhotoDtr;
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

function irHte(Institute $institute, Program $program, string $name): User
{
    $user = User::factory()->create(['role' => 'hte']);
    Hte::create([
        'user_id' => $user->id,
        'name' => $name,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

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

function irSubmit(User $intern, Requirement $requirement, array $attributes = []): void
{
    Storage::fake('public');
    RequirementSubmission::create([
        'user_id' => $intern->id,
        'requirement_id' => $requirement->id,
        'file_path' => UploadedFile::fake()->create('file.pdf', 1024, 'application/pdf')->store('requirement-submissions', 'public'),
        ...$attributes,
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

test('list counts post-deployment submissions only once hours are completed', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $completed = irIntern($institute, $program, ['email' => 'completed@smartlog.test']);
    Intern::where('user_id', $completed->id)->update(['ojt_status' => 'hours_completed']);
    $pending = irIntern($institute, $program, ['email' => 'pending@smartlog.test']);

    $pre = irRequirement($institute, ['name' => 'Med Cert', 'type' => 'pre_deployment']);
    $pre2 = irRequirement($institute, ['name' => 'MOA', 'type' => 'pre_deployment']);
    $post = irRequirement($institute, ['name' => 'Clearance', 'type' => 'post_deployment']);
    irRequirement($institute, ['name' => 'Inactive pre', 'type' => 'pre_deployment', 'is_active' => false]);

    irSubmit($completed, $pre);
    irSubmit($completed, $pre2);
    irSubmit($completed, $post);
    irSubmit($pending, $pre);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-requirements')
        ->assertOk()
        ->assertJsonPath('data.0.submitted', 1)
        ->assertJsonPath('data.0.total', 2)
        ->assertJsonPath('data.1.submitted', 3)
        ->assertJsonPath('data.1.total', 3);
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
    Intern::where('user_id', $intern->id)->update(['end_date' => '2026-12-20']);

    $checked = PhotoDtr::create([
        'intern_id' => $intern->intern->id,
        'dtr_date' => '2026-08-15',
        'am_in_time' => '08:00:00',
        'am_out_time' => '12:00:00',
        'pm_in_time' => '13:00:00',
        'pm_out_time' => '17:00:00',
        'status' => 'checked',
    ]);
    $pending = PhotoDtr::create([
        'intern_id' => $intern->intern->id,
        'dtr_date' => '2026-08-16',
        'am_in_time' => '08:00:00',
        'am_out_time' => '12:00:00',
        'pm_in_time' => '13:00:00',
        'pm_out_time' => '17:00:00',
        'status' => 'pending',
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-requirements/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.intern.full_name', $intern->full_name)
        ->assertJsonPath('data.intern.end_date', '2026-12-20')
        ->assertJsonPath('data.intern.earned_minutes', 480)
        ->assertJsonPath('data.submitted', 1)
        ->assertJsonPath('data.total', 2)
        ->assertJsonCount(2, 'data.requirements')
        ->assertJsonCount(0, 'data.placements')
        ->assertJsonStructure([
            'data' => [
                'intern' => ['uuid', 'full_name', 'email', 'program'],
                'submitted', 'total',
                'requirements' => [['id', 'name', 'description', 'type', 'submission']],
            ],
        ])
        ->assertJsonPath('data.requirements.1.submission.id', RequirementSubmission::first()->id);
});

test('coordinator detail hides post-deployment requirements until hours are completed', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);
    irRequirement($institute, ['name' => 'Med Cert', 'type' => 'pre_deployment']);
    irRequirement($institute, ['name' => 'Clearance', 'type' => 'post_deployment']);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-requirements/{$intern->uuid}")
        ->assertOk()
        ->assertJsonCount(1, 'data.requirements')
        ->assertJsonPath('data.requirements.0.type', 'pre_deployment');
});

test('coordinator detail shows post-deployment requirements once hours are completed', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'hours_completed']);
    irRequirement($institute, ['name' => 'Med Cert', 'type' => 'pre_deployment']);
    irRequirement($institute, ['name' => 'Clearance', 'type' => 'post_deployment']);
    irSubmit($intern, irRequirement($institute, ['name' => 'Case Study', 'type' => 'post_deployment']));

    $response = $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-requirements/{$intern->uuid}")
        ->assertOk()
        ->assertJsonCount(3, 'data.requirements')
        ->assertJsonPath('data.submitted', 0)
        ->assertJsonPath('data.total', 1);

    $types = collect($response->json('data.requirements'))->pluck('type')->sort()->values()->all();
    expect($types)->toBe(['post_deployment', 'post_deployment', 'pre_deployment']);
});

test('detail lists each placement with its own requirements after a transfer', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $first = irHte($institute, $program, 'Vinz Itech');
    $second = irHte($institute, $program, 'CICTO');
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);

    $record = $intern->intern;
    $record->forceFill(['assigned_hte' => $first->hte->id])->save();

    $med = irRequirement($institute, ['name' => 'Med Cert']);
    $moa = irRequirement($institute, ['name' => 'MOA']);

    irSubmit($intern, $med, ['placement_id' => $record->fresh()->activePlacement()->id]);
    RequirementSubmission::query()->update(['status' => 'approved']);

    // Transfer to the second host: the first placement closes, a fresh one opens.
    $record->forceFill(['assigned_hte' => $second->hte->id])->save();
    irSubmit($intern, $moa);

    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'completed']);

    $response = $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-requirements/{$intern->uuid}")
        ->assertOk();

    expect($response->json('data.placements'))->toHaveCount(2);

    // Newest first, the open placement leading and flagged current.
    expect($response->json('data.placements.0.hte'))->toBe('CICTO');
    expect($response->json('data.placements.0.is_current'))->toBeTrue();
    expect($response->json('data.placements.0.assigned_at'))->not->toBeNull();
    expect($response->json('data.placements.0.unassigned_at'))->toBeNull();
    expect($response->json('data.placements.1.hte'))->toBe('Vinz Itech');
    expect($response->json('data.placements.1.is_current'))->toBeFalse();
    expect($response->json('data.placements.1.assigned_at'))->not->toBeNull();
    expect($response->json('data.placements.1.unassigned_at'))->not->toBeNull();

    // Each placement carries only its own submissions for the same requirement set.
    $previous = collect($response->json('data.placements.1.requirements'))->keyBy('name');
    $current = collect($response->json('data.placements.0.requirements'))->keyBy('name');

    expect($previous['Med Cert']['submission']['status'])->toBe('approved');
    expect($previous['MOA']['submission'])->toBeNull();
    expect($current['Med Cert']['submission'])->toBeNull();
    expect($current['MOA']['submission']['status'])->toBe('pending');

    // The top-level payload still mirrors the placement in review.
    $topLevel = collect($response->json('data.requirements'))->keyBy('name');

    expect($topLevel['Med Cert']['submission'])->toBeNull();
    expect($topLevel['MOA']['submission']['status'])->toBe('pending');
    expect($response->json('data.submitted'))->toBe(1);
    expect($response->json('data.total'))->toBe(2);
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

test('coordinator can mark an intern as completed once all requirements are approved', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $pre = irRequirement($institute, ['name' => 'Med Cert', 'type' => 'pre_deployment']);
    $post = irRequirement($institute, ['name' => 'Clearance', 'type' => 'post_deployment']);
    irSubmit($intern, $pre);
    irSubmit($intern, $post);
    RequirementSubmission::query()->update(['status' => 'approved']);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/mark-completed")
        ->assertOk()
        ->assertJsonPath('data.ojt_status', 'completed');

    expect(Intern::where('user_id', $intern->id)->first()->ojt_status)->toBe('completed');

    $notification = UserNotification::where('user_id', $intern->id)->first();
    expect($notification->type)->toBe('ojt_completed');
});

test('coordinator cannot mark an intern completed before all requirements are approved', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $r1 = irRequirement($institute, ['name' => 'Med Cert']);
    $r2 = irRequirement($institute, ['name' => 'MOA']);
    irSubmit($intern, $r1);
    irSubmit($intern, $r2);
    RequirementSubmission::first()->update(['status' => 'approved']);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/mark-completed")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('requirements');

    expect(Intern::where('user_id', $intern->id)->first()->ojt_status)->toBe('ongoing');
});

test('coordinator cannot mark an already completed intern as completed', function () {
    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program, ['email' => 'intern@smartlog.test']);
    $requirement = irRequirement($institute);
    irSubmit($intern, $requirement);
    RequirementSubmission::query()->update(['status' => 'approved']);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'completed']);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/mark-completed")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('ojt_status');

    expect(Intern::where('user_id', $intern->id)->first()->ojt_status)->toBe('completed');
});

/**
 * Re-enroll an intern into a new term, mimicking an approved enrollment.
 */
function irReenroll(User $intern, Institute $institute, Program $program, AcademicTerm $term): Intern
{
    $record = Intern::create([
        'user_id' => $intern->id,
        'academic_year_id' => $term->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    $record->forceFill(['status' => 'approved', 'ojt_status' => 'pending'])->save();

    return $record;
}

test('coordinator reviews only the submissions of the term being viewed', function () {
    Storage::fake('public');

    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program);
    $firstTermIntern = $intern->intern;
    $requirement = irRequirement($institute);

    irSubmit($intern, $requirement);
    $firstSubmissionId = RequirementSubmission::where('intern_id', $firstTermIntern->id)->value('id');

    $secondTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);
    $secondTermIntern = irReenroll($intern, $institute, $program, $secondTerm);

    // The new term has no submission yet, so the previous term's must not appear.
    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-requirements/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.requirements.0.submission', null);

    // Once the intern submits for the new term, that is the only submission shown.
    RequirementSubmission::create([
        'intern_id' => $secondTermIntern->id,
        'user_id' => $intern->id,
        'requirement_id' => $requirement->id,
        'file_path' => UploadedFile::fake()->create('second.pdf', 1024, 'application/pdf')->store('requirement-submissions', 'public'),
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-requirements/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.requirements.0.submission.id', RequirementSubmission::where('intern_id', $secondTermIntern->id)->value('id'));

    // Both rows still exist.
    expect(RequirementSubmission::where('id', $firstSubmissionId)->exists())->toBeTrue()
        ->and(RequirementSubmission::count())->toBe(2);
});

test('coordinator cannot approve a previous term submission from the current term', function () {
    Storage::fake('public');

    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program);
    $requirement = irRequirement($institute);

    irSubmit($intern, $requirement);

    $secondTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);
    irReenroll($intern, $institute, $program, $secondTerm);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/{$requirement->id}/approve")
        ->assertStatus(422);

    expect(RequirementSubmission::first()->status)->toBe('pending');
});

test('approve all only clears the pending submissions of the current term', function () {
    Storage::fake('public');

    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program);
    $requirement = irRequirement($institute);

    irSubmit($intern, $requirement);
    $firstSubmissionId = RequirementSubmission::first()->id;

    $secondTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);
    $secondTermIntern = irReenroll($intern, $institute, $program, $secondTerm);

    $secondSubmission = RequirementSubmission::create([
        'intern_id' => $secondTermIntern->id,
        'user_id' => $intern->id,
        'requirement_id' => $requirement->id,
        'file_path' => UploadedFile::fake()->create('second.pdf', 1024, 'application/pdf')->store('requirement-submissions', 'public'),
    ]);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/approve-all")
        ->assertOk()
        ->assertJsonPath('data.count', 1);

    expect($secondSubmission->refresh()->status)->toBe('approved')
        ->and(RequirementSubmission::where('id', $firstSubmissionId)->value('status'))->toBe('pending');
});

test('a previous terms approvals do not deploy the intern in a new term', function () {
    Storage::fake('public');

    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program);
    $requirement = irRequirement($institute);

    irSubmit($intern, $requirement);
    RequirementSubmission::first()->forceFill(['status' => 'approved'])->save();

    $secondTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);
    irReenroll($intern, $institute, $program, $secondTerm);

    // The gate is per term, so a fresh checklist blocks deployment.
    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$intern->uuid}/deploy")
        ->assertStatus(422)
        ->assertJsonValidationErrors(['requirements']);

    expect($intern->intern->fresh()->academic_year_id)->not->toBe($secondTerm->id);
});

test('the coordinator intern list counts each term separately', function () {
    Storage::fake('public');

    $institute = irInstitute();
    $program = irProgram($institute);
    $coordinator = irCoordinator($institute);
    $intern = irIntern($institute, $program);
    $requirement = irRequirement($institute);

    irSubmit($intern, $requirement);

    $secondTerm = AcademicTerm::create(['code' => '2026-2027', 'description' => 'Second Semester']);
    irReenroll($intern, $institute, $program, $secondTerm);

    $response = $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-requirements')
        ->assertOk();

    // The first term shows 1 of 1 submitted; the new term shows 0 of 1.
    $rows = collect($response->json('data'))->keyBy('id');

    expect($rows[$intern->intern->id]['submitted'])->toBe(1)
        ->and($rows[Intern::where('user_id', $intern->id)->where('academic_year_id', $secondTerm->id)->value('id')]['submitted'])->toBe(0);
});
