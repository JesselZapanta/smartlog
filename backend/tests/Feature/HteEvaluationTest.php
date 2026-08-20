<?php

use App\Models\EvaluationCriterion;
use App\Models\Institute;
use App\Models\InternEvaluation;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function hteEvalCriterion(Institute $institute, string $category, string $indicator): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => $category,
        'indicator' => $indicator,
        'type' => 'intern',
        'status' => 'active',
    ]);
}

test('hte evaluation list includes assigned interns with progress status', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    hteEvalCriterion($institute, 'personal_characteristics', 'Dresses appropriately');
    hteEvalCriterion($institute, 'job_knowledge', 'Basic technical knowledge');

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/evaluations')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.evaluation.total', 2)
        ->assertJsonPath('data.0.evaluation.answered', 0)
        ->assertJsonPath('data.0.evaluation.status', 'not_evaluated');
});

test('hte evaluation form lists active intern criteria grouped in order', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    hteEvalCriterion($institute, 'job_knowledge', 'Job one');
    hteEvalCriterion($institute, 'personal_characteristics', 'Personal one');
    hteEvalCriterion($institute, 'work_characteristics', 'Work one');
    hteEvalCriterion($institute, 'personal_characteristics', 'Inactive personal')
        ->forceFill(['status' => 'inactive'])->save();

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/evaluations/{$intern->uuid}")
        ->assertOk()
        ->assertJsonCount(3, 'data.criteria')
        ->assertJsonPath('data.criteria.0.category', 'personal_characteristics')
        ->assertJsonPath('data.criteria.1.category', 'work_characteristics')
        ->assertJsonPath('data.criteria.2.category', 'job_knowledge')
        ->assertJsonPath('data.criteria.0.response', null);
});

test('hte can submit an evaluation with ratings and na', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    $personal = hteEvalCriterion($institute, 'personal_characteristics', 'Personal one');
    $work = hteEvalCriterion($institute, 'work_characteristics', 'Work one');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/evaluations/{$intern->uuid}", [
            'responses' => [
                ['criterion_id' => $personal->id, 'rating' => 5, 'is_na' => false],
                ['criterion_id' => $work->id, 'rating' => null, 'is_na' => true],
            ],
        ])
        ->assertStatus(201);

    expect(InternEvaluation::where('intern_id', $intern->intern->id)->count())->toBe(2);
    expect(InternEvaluation::where('criterion_id', $personal->id)->first()->rating)->toBe(5);
    expect(InternEvaluation::where('criterion_id', $work->id)->first()->is_na)->toBeTrue();
});

test('hte cannot evaluate an intern assigned to another hte', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $otherHte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $otherHte->hte->id);

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/evaluations/{$intern->uuid}")
        ->assertStatus(403);
});

test('hte evaluation rejects criteria outside the interns institute', function () {
    $institute = hteRecordInstitute();
    $otherInstitute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $otherProgram = hteRecordProgram($otherInstitute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    $foreign = hteEvalCriterion($otherInstitute, 'personal_characteristics', 'Foreign criterion');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/evaluations/{$intern->uuid}", [
            'responses' => [
                ['criterion_id' => $foreign->id, 'rating' => 3, 'is_na' => false],
            ],
        ])
        ->assertStatus(422);
});

test('hte evaluation list reflects completed status after all criteria answered', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    $personal = hteEvalCriterion($institute, 'personal_characteristics', 'Personal one');
    $work = hteEvalCriterion($institute, 'work_characteristics', 'Work one');

    $this->actingAs($hte, 'api')
        ->postJson("/api/hte/evaluations/{$intern->uuid}", [
            'responses' => [
                ['criterion_id' => $personal->id, 'rating' => 4, 'is_na' => false],
                ['criterion_id' => $work->id, 'rating' => 3, 'is_na' => false],
            ],
        ])
        ->assertStatus(201);

    $this->actingAs($hte, 'api')
        ->getJson('/api/hte/evaluations')
        ->assertOk()
        ->assertJsonPath('data.0.evaluation.answered', 2)
        ->assertJsonPath('data.0.evaluation.status', 'completed');
});

test('hte evaluation form prefills existing responses', function () {
    $institute = hteRecordInstitute();
    $program = hteRecordProgram($institute);
    $hte = hteRecordHte($institute, $program);
    $intern = hteRecordIntern($institute, $program, $hte->hte->id);

    $personal = hteEvalCriterion($institute, 'personal_characteristics', 'Personal one');

    InternEvaluation::create([
        'intern_id' => $intern->intern->id,
        'hte_id' => $hte->hte->id,
        'criterion_id' => $personal->id,
        'rating' => 2,
        'is_na' => false,
    ]);

    $this->actingAs($hte, 'api')
        ->getJson("/api/hte/evaluations/{$intern->uuid}")
        ->assertOk()
        ->assertJsonPath('data.criteria.0.response.rating', 2)
        ->assertJsonPath('data.criteria.0.response.is_na', false);
});
