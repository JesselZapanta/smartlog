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

uses(RefreshDatabase::class);

function pevalInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function pevalProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function pevalHteUser(Institute $institute, Program $program, string $name): User
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

function pevalInternUser(Institute $institute, Program $program, int $hteId, string $ojtStatus = 'ongoing'): User
{
    $user = User::factory()->create(['role' => 'intern']);
    $intern = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hteId,
        'ojt_status' => $ojtStatus,
    ]);
    $intern->forceFill(['status' => 'approved'])->save();

    return $user->fresh();
}

function pevalCoordinatorUser(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    return $user->fresh();
}

function pevalCriterion(Institute $institute, string $type, string $category, string $indicator): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => $category,
        'indicator' => $indicator,
        'type' => $type,
        'status' => 'active',
    ]);
}

function pevalAcceptedTransfer(User $internUser, int $fromHteId, int $fromPlacementId): TransferRequest
{
    return TransferRequest::create([
        'intern_id' => $internUser->intern->id,
        'academic_year_id' => $internUser->intern->academic_year_id,
        'from_hte_id' => $fromHteId,
        'from_placement_id' => $fromPlacementId,
        'status' => TransferRequest::STATUS_ACCEPTED,
        'accepted_at' => now(),
    ]);
}

test('hte evaluation progress counts only the open placement after a transfer', function () {
    $institute = pevalInstitute();
    $program = pevalProgram($institute);
    $hteA = pevalHteUser($institute, $program, 'Host A');
    $hteB = pevalHteUser($institute, $program, 'Host B');
    $internUser = pevalInternUser($institute, $program, $hteA->hte->id, 'hours_completed');
    $criterion = pevalCriterion($institute, 'intern', 'personal_characteristics', 'Dresses appropriately');

    $intern = $internUser->intern;
    $firstPlacement = $intern->activePlacement();

    InternEvaluation::create([
        'intern_id' => $intern->id,
        'hte_id' => $hteA->hte->id,
        'placement_id' => $firstPlacement->id,
        'criterion_id' => $criterion->id,
        'rating' => 5,
        'is_na' => false,
    ]);

    $intern->forceFill(['assigned_hte' => $hteB->hte->id])->save();

    $this->actingAs($hteB, 'api')
        ->getJson('/api/hte/evaluations')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.evaluation.answered', 0)
        ->assertJsonPath('data.0.evaluation.status', 'not_evaluated');

    $this->actingAs($hteA, 'api')
        ->getJson('/api/hte/evaluations')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('hte can evaluate again at the new placement after a transfer', function () {
    $institute = pevalInstitute();
    $program = pevalProgram($institute);
    $hteA = pevalHteUser($institute, $program, 'Host A');
    $hteB = pevalHteUser($institute, $program, 'Host B');
    $internUser = pevalInternUser($institute, $program, $hteA->hte->id, 'hours_completed');
    $criterion = pevalCriterion($institute, 'intern', 'work_characteristics', 'Works systematically');

    $intern = $internUser->intern;
    $firstPlacement = $intern->activePlacement();

    InternEvaluation::create([
        'intern_id' => $intern->id,
        'hte_id' => $hteA->hte->id,
        'placement_id' => $firstPlacement->id,
        'criterion_id' => $criterion->id,
        'rating' => 5,
        'is_na' => false,
    ]);

    $intern->forceFill(['assigned_hte' => $hteB->hte->id])->save();
    $secondPlacement = $intern->fresh()->activePlacement();

    $this->actingAs($hteB, 'api')
        ->postJson("/api/hte/evaluations/{$internUser->uuid}", [
            'responses' => [
                ['criterion_id' => $criterion->id, 'rating' => 3, 'is_na' => false],
            ],
        ])
        ->assertStatus(201);

    $newRow = InternEvaluation::where('placement_id', $secondPlacement->id)->first();
    expect($newRow)->not->toBeNull();
    expect($newRow->rating)->toBe(3);

    expect(InternEvaluation::where('placement_id', $firstPlacement->id)->first()->rating)->toBe(5);
});

test('intern can evaluate the outgoing hte while a transfer is accepted', function () {
    $institute = pevalInstitute();
    $program = pevalProgram($institute);
    $hteA = pevalHteUser($institute, $program, 'Host A');
    $internUser = pevalInternUser($institute, $program, $hteA->hte->id, 'ongoing');
    $criterion = pevalCriterion($institute, 'hte', 'personal_characteristics', 'Approachable');

    $intern = $internUser->intern;
    $placement = $intern->activePlacement();

    $this->actingAs($internUser, 'api')
        ->getJson('/api/intern/evaluations')
        ->assertStatus(422);

    pevalAcceptedTransfer($internUser, $hteA->hte->id, $placement->id);

    $this->actingAs($internUser, 'api')
        ->getJson('/api/intern/evaluations')
        ->assertOk()
        ->assertJsonPath('data.hte.name', 'Host A')
        ->assertJsonCount(1, 'data.criteria');

    $this->actingAs($internUser, 'api')
        ->postJson('/api/intern/evaluations', [
            'responses' => [
                ['criterion_id' => $criterion->id, 'rating' => 4, 'is_na' => false],
            ],
        ])
        ->assertStatus(201);

    $row = HteEvaluation::where('placement_id', $placement->id)->first();
    expect($row)->not->toBeNull();
    expect($row->rating)->toBe(4);
});

test('transfer flips to evaluated when the intern evaluates second', function () {
    $institute = pevalInstitute();
    $program = pevalProgram($institute);
    $hteA = pevalHteUser($institute, $program, 'Host A');
    $internUser = pevalInternUser($institute, $program, $hteA->hte->id, 'ongoing');
    $coordinator = pevalCoordinatorUser($institute, $program);
    $internCriterion = pevalCriterion($institute, 'intern', 'personal_characteristics', 'Punctual');
    $hteCriterion = pevalCriterion($institute, 'hte', 'job_knowledge', 'Explains tasks');

    $intern = $internUser->intern;
    $placement = $intern->activePlacement();
    $transfer = pevalAcceptedTransfer($internUser, $hteA->hte->id, $placement->id);

    InternEvaluation::create([
        'intern_id' => $intern->id,
        'hte_id' => $hteA->hte->id,
        'placement_id' => $placement->id,
        'criterion_id' => $internCriterion->id,
        'rating' => 5,
        'is_na' => false,
    ]);

    $this->actingAs($internUser, 'api')
        ->postJson('/api/intern/evaluations', [
            'responses' => [
                ['criterion_id' => $hteCriterion->id, 'rating' => 4, 'is_na' => false],
            ],
        ])
        ->assertStatus(201);

    $transfer->refresh();
    expect($transfer->status)->toBe(TransferRequest::STATUS_EVALUATED);
    expect($transfer->evaluated_at)->not->toBeNull();
    expect(UserNotification::where('user_id', $coordinator->id)->where('type', 'transfer_evaluated')->exists())->toBeTrue();
});

test('transfer flips to evaluated when the hte evaluates second', function () {
    $institute = pevalInstitute();
    $program = pevalProgram($institute);
    $hteA = pevalHteUser($institute, $program, 'Host A');
    $internUser = pevalInternUser($institute, $program, $hteA->hte->id, 'ongoing');
    $internCriterion = pevalCriterion($institute, 'intern', 'work_characteristics', 'Follows instructions');
    $hteCriterion = pevalCriterion($institute, 'hte', 'personal_characteristics', 'Gives feedback');

    $intern = $internUser->intern;
    $placement = $intern->activePlacement();
    $transfer = pevalAcceptedTransfer($internUser, $hteA->hte->id, $placement->id);

    HteEvaluation::create([
        'intern_id' => $intern->id,
        'hte_id' => $hteA->hte->id,
        'placement_id' => $placement->id,
        'criterion_id' => $hteCriterion->id,
        'rating' => 3,
        'is_na' => false,
    ]);

    $this->actingAs($hteA, 'api')
        ->postJson("/api/hte/evaluations/{$internUser->uuid}", [
            'responses' => [
                ['criterion_id' => $internCriterion->id, 'rating' => 5, 'is_na' => false],
            ],
        ])
        ->assertStatus(201);

    $transfer->refresh();
    expect($transfer->status)->toBe(TransferRequest::STATUS_EVALUATED);
    expect($transfer->evaluated_at)->not->toBeNull();
});

test('coordinator weighted average excludes na answers and follows the active placement', function () {
    $institute = pevalInstitute();
    $program = pevalProgram($institute);
    $hteA = pevalHteUser($institute, $program, 'Host A');
    $internUser = pevalInternUser($institute, $program, $hteA->hte->id, 'hours_completed');
    $coordinator = pevalCoordinatorUser($institute, $program);
    $rated = pevalCriterion($institute, 'intern', 'personal_characteristics', 'Rated indicator');
    $na = pevalCriterion($institute, 'intern', 'personal_characteristics', 'Na indicator');

    $intern = $internUser->intern;
    $placement = $intern->activePlacement();

    InternEvaluation::create([
        'intern_id' => $intern->id,
        'hte_id' => $hteA->hte->id,
        'placement_id' => $placement->id,
        'criterion_id' => $rated->id,
        'rating' => 4,
        'is_na' => false,
    ]);
    InternEvaluation::create([
        'intern_id' => $intern->id,
        'hte_id' => $hteA->hte->id,
        'placement_id' => $placement->id,
        'criterion_id' => $na->id,
        'rating' => null,
        'is_na' => true,
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-evaluations')
        ->assertOk()
        ->assertJsonPath('data.0.evaluation.answered', 2)
        ->assertJsonPath('data.0.evaluation.status', 'completed')
        ->assertJsonPath('data.0.evaluation.weighted_average', 1.2);
});
