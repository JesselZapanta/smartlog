<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\HteEvaluation;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\Program;
use App\Models\TransferRequest;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(RefreshDatabase::class);

function tflowInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function tflowProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function tflowHte(Institute $institute, Program $program, string $name): User
{
    $user = User::factory()->create(['role' => 'hte']);
    Hte::create([
        'user_id' => $user->id,
        'name' => $name,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    return $user->fresh();
}

function tflowIntern(Institute $institute, Program $program, int $hteId, string $ojtStatus = 'ongoing', ?int $academicYearId = null): User
{
    $user = User::factory()->create(['role' => 'intern']);
    $intern = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => $academicYearId ?? AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester', 'status' => 'active'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hteId,
        'ojt_status' => $ojtStatus,
    ]);
    $intern->forceFill(['status' => 'approved'])->save();

    return $user->fresh();
}

function tflowLeader(Institute $institute, Program $program, string $role): User
{
    $user = User::factory()->create(['role' => $role]);
    Coordinator::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    return $user->fresh();
}

function tflowCriterion(Institute $institute, string $type, string $category, string $indicator): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => $category,
        'indicator' => $indicator,
        'type' => $type,
        'status' => 'active',
    ]);
}

/**
 * Drives a transfer from request to `evaluated`, answering one criterion per
 * direction.
 *
 * @return array{transfer: TransferRequest, internUser: User}
 */
function tflowEvaluatedTransfer(TestCase $test, Institute $institute, Program $program, User $hteA, User $internUser, User $instructor): array
{
    $intern = $internUser->intern;
    $internCriterion = tflowCriterion($institute, 'intern', 'personal_characteristics', 'Punctual');
    $hteCriterion = tflowCriterion($institute, 'hte', 'work_characteristics', 'Guides the intern');

    $test->actingAs($instructor, 'api')
        ->postJson('/api/instructor/transfer-requests', [
            'intern_uuid' => $internUser->uuid,
            'reason' => 'The intern needs a host closer to their residence.',
        ])
        ->assertCreated();

    $transfer = TransferRequest::where('intern_id', $intern->id)->firstOrFail();

    $test->actingAs($hteA, 'api')
        ->postJson("/api/hte/transfer-requests/{$transfer->uuid}/accept")
        ->assertOk();

    $test->actingAs($hteA, 'api')
        ->postJson("/api/hte/evaluations/{$internUser->uuid}", [
            'responses' => [['criterion_id' => $internCriterion->id, 'rating' => 5, 'is_na' => false]],
        ])
        ->assertStatus(201);

    $test->actingAs($internUser, 'api')
        ->postJson('/api/intern/evaluations', [
            'responses' => [['criterion_id' => $hteCriterion->id, 'rating' => 4, 'is_na' => false]],
        ])
        ->assertStatus(201);

    return ['transfer' => $transfer->refresh(), 'internUser' => $internUser];
}

test('a transfer runs end to end from request to reassignment', function () {
    $institute = tflowInstitute();
    $program = tflowProgram($institute);
    $hteA = tflowHte($institute, $program, 'Host A');
    $hteB = tflowHte($institute, $program, 'Host B');
    $instructor = tflowLeader($institute, $program, 'ojt_instructor');
    $coordinator = tflowLeader($institute, $program, 'ojt_coordinator');
    $internUser = tflowIntern($institute, $program, $hteA->hte->id, 'ongoing');

    $intern = $internUser->intern;
    $firstPlacement = $intern->activePlacement();

    ['transfer' => $transfer] = tflowEvaluatedTransfer($this, $institute, $program, $hteA, $internUser, $instructor);

    expect($transfer->status)->toBe(TransferRequest::STATUS_EVALUATED);
    expect($transfer->from_placement_id)->toBe($firstPlacement->id);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/transfer-requests/{$transfer->uuid}/reassign", [
            'to_hte_id' => $hteB->hte->id,
        ])
        ->assertOk()
        ->assertJsonPath('data.status', TransferRequest::STATUS_REASSIGNED)
        ->assertJsonPath('data.ready_to_reassign', false);

    $intern = $intern->fresh();
    expect($intern->assigned_hte)->toBe($hteB->hte->id);
    expect($intern->ojt_status)->toBe('pending');

    $firstPlacement = $firstPlacement->fresh();
    expect($firstPlacement->unassigned_at)->not->toBeNull();
    expect($firstPlacement->unassigned_by)->toBe($coordinator->id);

    $secondPlacement = $intern->activePlacement();
    expect($secondPlacement)->not->toBeNull();
    expect($secondPlacement->hte_id)->toBe($hteB->hte->id);
    expect($secondPlacement->transfer_request_id)->toBe($transfer->id);
    expect($secondPlacement->assigned_by)->toBe($coordinator->id);

    $transfer = $transfer->fresh();
    expect($transfer->status)->toBe(TransferRequest::STATUS_REASSIGNED);
    expect($transfer->to_hte_id)->toBe($hteB->hte->id);
    expect($transfer->to_placement_id)->toBe($secondPlacement->id);
    expect($transfer->reassigned_at)->not->toBeNull();
    expect($transfer->reassigned_by)->toBe($coordinator->id);

    expect(InternEvaluation::where('placement_id', $firstPlacement->id)->count())->toBe(1);
    expect(HteEvaluation::where('placement_id', $firstPlacement->id)->count())->toBe(1);

    expect(UserNotification::where('type', 'transfer_requested')->count())->toBe(2)
        ->and(UserNotification::where('type', 'transfer_accepted')->count())->toBe(2)
        ->and(UserNotification::where('type', 'transfer_evaluated')->count())->toBe(2)
        ->and(UserNotification::where('type', 'transfer_reassigned')->count())->toBe(4);

    expect(UserNotification::where('user_id', $internUser->id)->where('type', 'transfer_reassigned')->exists())->toBeTrue();

    // The intern keeps seeing the finished transfer until they are re-deployed.
    $this->actingAs($internUser, 'api')
        ->getJson('/api/intern/transfer-request')
        ->assertOk()
        ->assertJsonPath('data.status', TransferRequest::STATUS_REASSIGNED)
        ->assertJsonPath('data.to_hte.name', 'Host B')
        ->assertJsonPath('data.evaluation', null);
});

test('the instructor cannot open a second transfer for the same intern', function () {
    $institute = tflowInstitute();
    $program = tflowProgram($institute);
    $hteA = tflowHte($institute, $program, 'Host A');
    $instructor = tflowLeader($institute, $program, 'ojt_instructor');
    $internUser = tflowIntern($institute, $program, $hteA->hte->id, 'ongoing');

    $this->actingAs($instructor, 'api')
        ->postJson('/api/instructor/transfer-requests', [
            'intern_uuid' => $internUser->uuid,
            'reason' => 'First request reason here.',
        ])
        ->assertCreated();

    $this->actingAs($instructor, 'api')
        ->postJson('/api/instructor/transfer-requests', [
            'intern_uuid' => $internUser->uuid,
            'reason' => 'Second request reason here.',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['intern_uuid']);

    expect(TransferRequest::count())->toBe(1);
});

test('the instructor cannot request a transfer for an intern who is not deployed', function () {
    $institute = tflowInstitute();
    $program = tflowProgram($institute);
    $hteA = tflowHte($institute, $program, 'Host A');
    $instructor = tflowLeader($institute, $program, 'ojt_instructor');
    $internUser = tflowIntern($institute, $program, $hteA->hte->id, 'pending');

    $this->actingAs($instructor, 'api')
        ->postJson('/api/instructor/transfer-requests', [
            'intern_uuid' => $internUser->uuid,
            'reason' => 'Needs a different host establishment.',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['intern_uuid']);
});

test('the instructor cannot request a transfer for an intern from a previous academic term', function () {
    $institute = tflowInstitute();
    $program = tflowProgram($institute);
    $hteA = tflowHte($institute, $program, 'Host A');
    $instructor = tflowLeader($institute, $program, 'ojt_instructor');

    $previousTerm = AcademicTerm::create([
        'code' => '251',
        'description' => '1ST SEM AY 2025-2026',
        'status' => 'inactive',
        'start_at' => '2025-08-01 00:00:00',
    ]);

    AcademicTerm::create([
        'code' => '262',
        'description' => '2ND SEM AY 2026-2027',
        'status' => 'active',
        'start_at' => '2026-11-07 00:00:00',
    ]);

    $internUser = tflowIntern($institute, $program, $hteA->hte->id, 'ongoing', $previousTerm->id);

    $this->actingAs($instructor, 'api')
        ->postJson('/api/instructor/transfer-requests', [
            'intern_uuid' => $internUser->uuid,
            'reason' => 'The intern needs a host closer to their residence.',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['intern_uuid']);

    expect(TransferRequest::count())->toBe(0);
});

test('only the requesting hte can accept, and only once', function () {
    $institute = tflowInstitute();
    $program = tflowProgram($institute);
    $hteA = tflowHte($institute, $program, 'Host A');
    $hteC = tflowHte($institute, $program, 'Host C');
    $instructor = tflowLeader($institute, $program, 'ojt_instructor');
    $internUser = tflowIntern($institute, $program, $hteA->hte->id, 'ongoing');

    $this->actingAs($instructor, 'api')
        ->postJson('/api/instructor/transfer-requests', [
            'intern_uuid' => $internUser->uuid,
            'reason' => 'Host is at full capacity.',
        ])
        ->assertCreated();

    $transfer = TransferRequest::firstOrFail();

    $this->actingAs($hteC, 'api')
        ->postJson("/api/hte/transfer-requests/{$transfer->uuid}/accept")
        ->assertForbidden();

    $this->actingAs($hteA, 'api')
        ->postJson("/api/hte/transfer-requests/{$transfer->uuid}/accept")
        ->assertOk()
        ->assertJsonPath('data.status', TransferRequest::STATUS_ACCEPTED);

    $this->actingAs($hteA, 'api')
        ->postJson("/api/hte/transfer-requests/{$transfer->uuid}/accept")
        ->assertUnprocessable();
});

test('the hte list attaches evaluation progress to accepted transfers', function () {
    $institute = tflowInstitute();
    $program = tflowProgram($institute);
    $hteA = tflowHte($institute, $program, 'Host A');
    $instructor = tflowLeader($institute, $program, 'ojt_instructor');
    $internUser = tflowIntern($institute, $program, $hteA->hte->id, 'ongoing');

    tflowCriterion($institute, 'intern', 'personal_characteristics', 'Punctual');
    tflowCriterion($institute, 'hte', 'work_characteristics', 'Guides the intern');

    $this->actingAs($instructor, 'api')
        ->postJson('/api/instructor/transfer-requests', [
            'intern_uuid' => $internUser->uuid,
            'reason' => 'Host is at full capacity.',
        ])
        ->assertCreated();

    $transfer = TransferRequest::firstOrFail();

    $this->actingAs($hteA, 'api')
        ->getJson('/api/hte/transfer-requests')
        ->assertOk()
        ->assertJsonPath('data.0.status', TransferRequest::STATUS_REQUESTED)
        ->assertJsonMissingPath('data.0.progress');

    $this->actingAs($hteA, 'api')
        ->postJson("/api/hte/transfer-requests/{$transfer->uuid}/accept")
        ->assertOk();

    $this->actingAs($hteA, 'api')
        ->getJson('/api/hte/transfer-requests')
        ->assertOk()
        ->assertJsonPath('data.0.status', TransferRequest::STATUS_ACCEPTED)
        ->assertJsonPath('data.0.progress.intern.total', 1)
        ->assertJsonPath('data.0.progress.intern.answered', 0)
        ->assertJsonPath('data.0.progress.intern.complete', false)
        ->assertJsonPath('data.0.progress.hte.total', 1)
        ->assertJsonPath('data.0.progress.hte.answered', 0)
        ->assertJsonPath('data.0.progress.hte.complete', false);
});

test('reassignment is rejected until evaluations finish and for invalid targets', function () {
    $institute = tflowInstitute();
    $program = tflowProgram($institute);
    $hteA = tflowHte($institute, $program, 'Host A');
    $hteB = tflowHte($institute, $program, 'Host B');
    $instructor = tflowLeader($institute, $program, 'ojt_instructor');
    $coordinator = tflowLeader($institute, $program, 'ojt_coordinator');
    $internUser = tflowIntern($institute, $program, $hteA->hte->id, 'ongoing');

    $this->actingAs($instructor, 'api')
        ->postJson('/api/instructor/transfer-requests', [
            'intern_uuid' => $internUser->uuid,
            'reason' => 'Transfer for scheduling reasons.',
        ])
        ->assertCreated();

    $transfer = TransferRequest::firstOrFail();

    // Still `requested`: not ready.
    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/transfer-requests/{$transfer->uuid}/reassign", [
            'to_hte_id' => $hteB->hte->id,
        ])
        ->assertUnprocessable();

    tflowAcceptAndEvaluate($this, $institute, $hteA, $internUser, $transfer);

    // Same HTE as the current one.
    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/transfer-requests/{$transfer->uuid}/reassign", [
            'to_hte_id' => $hteA->hte->id,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['to_hte_id']);

    expect($internUser->intern->fresh()->assigned_hte)->toBe($hteA->hte->id);
});

test('the intern transfer endpoint reports progress and unlocks the evaluation prompt', function () {
    $institute = tflowInstitute();
    $program = tflowProgram($institute);
    $hteA = tflowHte($institute, $program, 'Host A');
    $instructor = tflowLeader($institute, $program, 'ojt_instructor');
    $internUser = tflowIntern($institute, $program, $hteA->hte->id, 'ongoing');

    $hteCriterion = tflowCriterion($institute, 'hte', 'personal_characteristics', 'Gives feedback');

    $this->actingAs($internUser, 'api')
        ->getJson('/api/intern/transfer-request')
        ->assertOk()
        ->assertJsonPath('data', null);

    $this->actingAs($instructor, 'api')
        ->postJson('/api/instructor/transfer-requests', [
            'intern_uuid' => $internUser->uuid,
            'reason' => 'Relocation nearer to the intern.',
        ])
        ->assertCreated();

    $transfer = TransferRequest::firstOrFail();

    $this->actingAs($hteA, 'api')
        ->postJson("/api/hte/transfer-requests/{$transfer->uuid}/accept")
        ->assertOk();

    $this->actingAs($internUser, 'api')
        ->getJson('/api/intern/transfer-request')
        ->assertOk()
        ->assertJsonPath('data.status', TransferRequest::STATUS_ACCEPTED)
        ->assertJsonPath('data.from_hte.name', 'Host A')
        ->assertJsonPath('data.evaluation.can_evaluate', true)
        ->assertJsonPath('data.evaluation.total', 1)
        ->assertJsonPath('data.evaluation.submitted', false);

    // The evaluation form tells the intern why it opened early.
    $this->actingAs($internUser, 'api')
        ->getJson('/api/intern/evaluations')
        ->assertOk()
        ->assertJsonPath('data.transfer.status', TransferRequest::STATUS_ACCEPTED);

    $this->actingAs($internUser, 'api')
        ->postJson('/api/intern/evaluations', [
            'responses' => [['criterion_id' => $hteCriterion->id, 'rating' => 5, 'is_na' => false]],
        ])
        ->assertStatus(201);

    $this->actingAs($internUser, 'api')
        ->getJson('/api/intern/transfer-request')
        ->assertOk()
        ->assertJsonPath('data.evaluation.submitted', true)
        ->assertJsonPath('data.evaluation.complete', true);
});

test('completion is blocked while a transfer is open, then allowed after reassignment', function () {
    $institute = tflowInstitute();
    $program = tflowProgram($institute);
    $hteA = tflowHte($institute, $program, 'Host A');
    $hteB = tflowHte($institute, $program, 'Host B');
    $instructor = tflowLeader($institute, $program, 'ojt_instructor');
    $coordinator = tflowLeader($institute, $program, 'ojt_coordinator');
    $internUser = tflowIntern($institute, $program, $hteA->hte->id, 'ongoing');

    ['transfer' => $transfer] = tflowEvaluatedTransfer($this, $institute, $program, $hteA, $internUser, $instructor);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$internUser->uuid}/mark-completed")
        ->assertUnprocessable();

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/transfer-requests/{$transfer->uuid}/reassign", [
            'to_hte_id' => $hteB->hte->id,
        ])
        ->assertOk();

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/intern-requirements/{$internUser->uuid}/mark-completed")
        ->assertUnprocessable()
        ->assertJsonMissingValidationErrors(['transfer']);
});

test('the lists expose the transfer to its participants', function () {
    $institute = tflowInstitute();
    $program = tflowProgram($institute);
    $hteA = tflowHte($institute, $program, 'Host A');
    $instructor = tflowLeader($institute, $program, 'ojt_instructor');
    $coordinator = tflowLeader($institute, $program, 'ojt_coordinator');
    $internUser = tflowIntern($institute, $program, $hteA->hte->id, 'ongoing');

    $this->actingAs($instructor, 'api')
        ->postJson('/api/instructor/transfer-requests', [
            'intern_uuid' => $internUser->uuid,
            'reason' => 'Needs a nearer host for commute.',
        ])
        ->assertCreated();

    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/transfer-requests')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', TransferRequest::STATUS_REQUESTED)
        ->assertJsonPath('data.0.intern.uuid', $internUser->uuid);

    $this->actingAs($hteA, 'api')
        ->getJson('/api/hte/transfer-requests')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    // The evaluation list badges the intern with the open transfer.
    $this->actingAs($hteA, 'api')
        ->getJson('/api/hte/evaluations')
        ->assertOk()
        ->assertJsonPath('data.0.transfer.status', TransferRequest::STATUS_REQUESTED);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/transfer-requests')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.from_hte.name', 'Host A');
});

/**
 * Accepts and fully evaluates a pending transfer.
 */
function tflowAcceptAndEvaluate(TestCase $test, Institute $institute, User $hteA, User $internUser, TransferRequest $transfer): void
{
    $internCriterion = tflowCriterion($institute, 'intern', 'job_knowledge', 'Learns quickly');
    $hteCriterion = tflowCriterion($institute, 'hte', 'job_knowledge', 'Clarifies instructions');

    $test->actingAs($hteA, 'api')
        ->postJson("/api/hte/transfer-requests/{$transfer->uuid}/accept")
        ->assertOk();

    $test->actingAs($hteA, 'api')
        ->postJson("/api/hte/evaluations/{$internUser->uuid}", [
            'responses' => [['criterion_id' => $internCriterion->id, 'rating' => 4, 'is_na' => false]],
        ])
        ->assertStatus(201);

    $test->actingAs($internUser, 'api')
        ->postJson('/api/intern/evaluations', [
            'responses' => [['criterion_id' => $hteCriterion->id, 'rating' => 5, 'is_na' => false]],
        ])
        ->assertStatus(201);
}
