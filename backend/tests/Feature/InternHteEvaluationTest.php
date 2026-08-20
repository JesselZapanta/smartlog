<?php

use App\Models\EvaluationCriterion;
use App\Models\HteEvaluation;
use App\Models\Institute;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function internEvalHteCriterion(Institute $institute, string $category, string $indicator): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => $category,
        'indicator' => $indicator,
        'type' => 'hte',
        'status' => 'active',
    ]);
}

test('intern hours_completed can view hte evaluation form with hte criteria ordered', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hteUser = hteRecordHte($institute, $program);
    $internUser = hteRecordIntern($institute, $program, $hteUser->hte->id, 'hours_completed');

    internEvalHteCriterion($institute, 'job_knowledge', 'Job one');
    internEvalHteCriterion($institute, 'personal_characteristics', 'Personal one');
    internEvalHteCriterion($institute, 'work_characteristics', 'Work one');
    internEvalHteCriterion($institute, 'personal_characteristics', 'Inactive')->forceFill(['status' => 'inactive'])->save();

    $this->actingAs($internUser, 'api')
        ->getJson('/api/intern/evaluations')
        ->assertOk()
        ->assertJsonCount(3, 'data.criteria')
        ->assertJsonPath('data.criteria.0.category', 'personal_characteristics')
        ->assertJsonPath('data.criteria.1.category', 'work_characteristics')
        ->assertJsonPath('data.criteria.2.category', 'job_knowledge');
});

test('intern not hours_completed cannot view hte evaluation', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hteUser = hteRecordHte($institute, $program);
    $internUser = hteRecordIntern($institute, $program, $hteUser->hte->id, 'ongoing');

    $this->actingAs($internUser, 'api')
        ->getJson('/api/intern/evaluations')
        ->assertStatus(422);
});

test('intern hours_completed can submit hte evaluation with ratings and na', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hteUser = hteRecordHte($institute, $program);
    $internUser = hteRecordIntern($institute, $program, $hteUser->hte->id, 'hours_completed');

    $personal = internEvalHteCriterion($institute, 'personal_characteristics', 'Personal one');
    $work = internEvalHteCriterion($institute, 'work_characteristics', 'Work one');

    $this->actingAs($internUser, 'api')
        ->postJson('/api/intern/evaluations', [
            'responses' => [
                ['criterion_id' => $personal->id, 'rating' => 5, 'is_na' => false],
                ['criterion_id' => $work->id, 'rating' => null, 'is_na' => true],
            ],
        ])
        ->assertStatus(201);

    expect(HteEvaluation::where('intern_id', $internUser->intern->id)->count())->toBe(2);
    expect(HteEvaluation::where('criterion_id', $personal->id)->first()->rating)->toBe(5);
    expect(HteEvaluation::where('criterion_id', $work->id)->first()->is_na)->toBeTrue();
});

test('intern hte evaluation is read only after submit', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hteUser = hteRecordHte($institute, $program);
    $internUser = hteRecordIntern($institute, $program, $hteUser->hte->id, 'hours_completed');

    $personal = internEvalHteCriterion($institute, 'personal_characteristics', 'Personal one');

    $this->actingAs($internUser, 'api')
        ->postJson('/api/intern/evaluations', [
            'responses' => [['criterion_id' => $personal->id, 'rating' => 4, 'is_na' => false]],
        ])
        ->assertStatus(201);

    $this->actingAs($internUser, 'api')
        ->postJson('/api/intern/evaluations', [
            'responses' => [['criterion_id' => $personal->id, 'rating' => 5, 'is_na' => false]],
        ])
        ->assertStatus(422)
        ->assertJsonPath('errors.evaluation.0', 'This evaluation has already been submitted and cannot be updated.');
});

test('intern hte evaluation rejects criteria outside institute', function () {
    $institute = hteRecordInstitute();
    $otherInstitute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hteUser = hteRecordHte($institute, $program);
    $internUser = hteRecordIntern($institute, $program, $hteUser->hte->id, 'hours_completed');

    $foreign = internEvalHteCriterion($otherInstitute, 'personal_characteristics', 'Foreign');

    $this->actingAs($internUser, 'api')
        ->postJson('/api/intern/evaluations', [
            'responses' => [['criterion_id' => $foreign->id, 'rating' => 3, 'is_na' => false]],
        ])
        ->assertStatus(422);
});
