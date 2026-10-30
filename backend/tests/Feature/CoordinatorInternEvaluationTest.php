<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function coordEvalInstitute2(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function coordEvalProgram2(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function coordEvalCoordinator2(Institute $institute): User
{
    $user = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => coordEvalProgram2($institute)->id,
    ]);

    return $user;
}

function coordEvalHte2(Institute $institute, Program $program, string $name = 'Test HTE'): User
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

function coordEvalIntern2(Institute $institute, Program $program, int $hteId, string $ojtStatus = 'hours_completed'): User
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

function coordEvalCriterion2(Institute $institute, string $category, string $indicator): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => $category,
        'indicator' => $indicator,
        'type' => 'intern',
        'status' => 'active',
    ]);
}

test('coordinator can list interns with evaluation progress', function () {
    $institute = coordEvalInstitute2();
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $hte = coordEvalHte2($institute, $program);
    $intern = coordEvalIntern2($institute, $program, $hte->hte->id);

    coordEvalCriterion2($institute, 'personal_characteristics', 'Dresses appropriately');
    coordEvalCriterion2($institute, 'work_characteristics', 'Works systematically');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-evaluations')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.evaluation.total', 2)
        ->assertJsonPath('data.0.evaluation.answered', 0)
        ->assertJsonPath('data.0.evaluation.status', 'not_evaluated');
});

test('coordinator can view intern evaluation read-only with responses', function () {
    $institute = coordEvalInstitute2();
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $hte = coordEvalHte2($institute, $program);
    $intern = coordEvalIntern2($institute, $program, $hte->hte->id);

    $c1 = coordEvalCriterion2($institute, 'personal_characteristics', 'Personal one');
    $c2 = coordEvalCriterion2($institute, 'job_knowledge', 'Job one');

    InternEvaluation::create([
        'intern_id' => $intern->intern->id,
        'hte_id' => $hte->hte->id,
        'criterion_id' => $c1->id,
        'rating' => 5,
        'is_na' => false,
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-evaluations/{$intern->uuid}")
        ->assertOk()
        ->assertJsonCount(2, 'data.criteria')
        ->assertJsonCount(1, 'data.placements')
        ->assertJsonPath('data.placements.0.hte.name', 'Test HTE')
        ->assertJsonPath('data.placements.0.is_current', true)
        ->assertJsonPath("data.placements.0.responses.{$c1->id}.rating", 5)
        ->assertJsonPath("data.placements.0.responses.{$c1->id}.is_na", false)
        ->assertJsonMissingPath("data.placements.0.responses.{$c2->id}")
        ->assertJsonPath('data.placements.0.summary.answered', 1)
        ->assertJsonPath('data.placements.0.summary.total', 2)
        ->assertJsonPath('data.placements.0.summary.complete', false)
        ->assertJsonPath('data.placements.0.summary.categories.personal_characteristics', 5)
        ->assertJsonPath('data.placements.0.summary.categories.job_knowledge', null)
        ->assertJsonPath('data.blended_average', null)
        ->assertJsonPath('data.blended_placements', 0)
        ->assertJsonPath('data.intern.uuid', $intern->uuid);
});

test('coordinator sees every placement with responses and the blended average', function () {
    $institute = coordEvalInstitute2();
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $oldHost = coordEvalHte2($institute, $program, 'Old Host');
    $newHost = coordEvalHte2($institute, $program, 'New Host');
    $internUser = coordEvalIntern2($institute, $program, $oldHost->hte->id, 'ongoing');
    $intern = $internUser->intern;

    $personal = coordEvalCriterion2($institute, 'personal_characteristics', 'Personal one');
    $work = coordEvalCriterion2($institute, 'work_characteristics', 'Work one');
    $job = coordEvalCriterion2($institute, 'job_knowledge', 'Job one');

    $answer = function (int $hteId, array $ratings) use ($intern, $personal, $work, $job): void {
        $criteria = [$personal, $work, $job];

        foreach ($ratings as $index => $rating) {
            InternEvaluation::create([
                'intern_id' => $intern->id,
                'hte_id' => $hteId,
                'criterion_id' => $criteria[$index]->id,
                'rating' => $rating,
                'is_na' => false,
            ]);
        }
    };

    // Closing placement: personal 4, work 4, job 5 → weighted 4.4.
    $answer($oldHost->hte->id, [4, 4, 5]);

    // Transfer: flipping `assigned_hte` closes the old placement and opens one
    // for the new host.
    $intern->forceFill(['assigned_hte' => $newHost->hte->id, 'ojt_status' => 'ongoing'])->save();

    // New placement: all 2s → weighted 2.0.
    $answer($newHost->hte->id, [2, 2, 2]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-evaluations/{$internUser->uuid}")
        ->assertOk()
        ->assertJsonCount(2, 'data.placements')
        ->assertJsonPath('data.placements.0.hte.name', 'Old Host')
        ->assertJsonPath('data.placements.0.is_current', false)
        ->assertJsonPath('data.placements.0.summary.complete', true)
        ->assertJsonPath('data.placements.0.summary.weighted_average', 4.4)
        ->assertJsonPath("data.placements.0.responses.{$personal->id}.rating", 4)
        ->assertJsonPath('data.placements.1.hte.name', 'New Host')
        ->assertJsonPath('data.placements.1.is_current', true)
        ->assertJsonPath('data.placements.1.summary.complete', true)
        ->assertJsonPath('data.placements.1.summary.weighted_average', 2)
        ->assertJsonPath("data.placements.1.responses.{$personal->id}.rating", 2)
        ->assertJsonPath('data.blended_average', 3.2)
        ->assertJsonPath('data.blended_placements', 2);
});

test('coordinator blended average only counts completed placements', function () {
    $institute = coordEvalInstitute2();
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $oldHost = coordEvalHte2($institute, $program, 'Old Host');
    $newHost = coordEvalHte2($institute, $program, 'New Host');
    $internUser = coordEvalIntern2($institute, $program, $oldHost->hte->id, 'ongoing');
    $intern = $internUser->intern;

    $personal = coordEvalCriterion2($institute, 'personal_characteristics', 'Personal one');
    $job = coordEvalCriterion2($institute, 'job_knowledge', 'Job one');

    InternEvaluation::create([
        'intern_id' => $intern->id,
        'hte_id' => $oldHost->hte->id,
        'criterion_id' => $personal->id,
        'rating' => 3,
        'is_na' => false,
    ]);

    InternEvaluation::create([
        'intern_id' => $intern->id,
        'hte_id' => $oldHost->hte->id,
        'criterion_id' => $job->id,
        'rating' => 3,
        'is_na' => true,
    ]);

    $intern->forceFill(['assigned_hte' => $newHost->hte->id])->save();

    InternEvaluation::create([
        'intern_id' => $intern->id,
        'hte_id' => $newHost->hte->id,
        'criterion_id' => $personal->id,
        'rating' => 5,
        'is_na' => false,
    ]);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-evaluations/{$internUser->uuid}")
        ->assertOk()
        ->assertJsonCount(2, 'data.placements')
        ->assertJsonPath('data.placements.0.summary.complete', true)
        ->assertJsonPath('data.placements.0.summary.categories.job_knowledge', null)
        ->assertJsonPath('data.placements.0.summary.weighted_average', 0.9)
        ->assertJsonPath('data.placements.1.summary.complete', false)
        ->assertJsonPath('data.placements.1.summary.answered', 1)
        ->assertJsonPath('data.placements.1.summary.weighted_average', 1.5)
        ->assertJsonPath('data.blended_average', 0.9)
        ->assertJsonPath('data.blended_placements', 1);
});

test('coordinator list blends the average across placements for a transferred intern', function () {
    $institute = coordEvalInstitute2();
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $oldHost = coordEvalHte2($institute, $program, 'Old Host');
    $newHost = coordEvalHte2($institute, $program, 'New Host');
    $internUser = coordEvalIntern2($institute, $program, $oldHost->hte->id, 'completed');
    $intern = $internUser->intern;

    $personal = coordEvalCriterion2($institute, 'personal_characteristics', 'Personal one');
    $work = coordEvalCriterion2($institute, 'work_characteristics', 'Work one');
    $job = coordEvalCriterion2($institute, 'job_knowledge', 'Job one');

    // Closing placement: a complete set at 1 → weighted 1.0.
    foreach ([$personal, $work, $job] as $criterion) {
        InternEvaluation::create([
            'intern_id' => $intern->id,
            'hte_id' => $oldHost->hte->id,
            'criterion_id' => $criterion->id,
            'rating' => 1,
            'is_na' => false,
        ]);
    }

    $intern->forceFill(['assigned_hte' => $newHost->hte->id])->save();

    // Open placement: only two of three criteria answered, so it stays
    // partial and out of the blend.
    foreach ([$personal, $work] as $criterion) {
        InternEvaluation::create([
            'intern_id' => $intern->id,
            'hte_id' => $newHost->hte->id,
            'criterion_id' => $criterion->id,
            'rating' => 5,
            'is_na' => false,
        ]);
    }

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-evaluations')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.evaluation.total', 6)
        ->assertJsonPath('data.0.evaluation.answered', 5)
        ->assertJsonPath('data.0.evaluation.status', 'partial')
        ->assertJsonPath('data.0.evaluation.weighted_average', 1);
});

test('coordinator cannot view intern evaluation outside institute', function () {
    $institute = coordEvalInstitute2();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $otherProgram = coordEvalProgram2($otherInstitute);
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $hte = coordEvalHte2($otherInstitute, $otherProgram);
    $intern = coordEvalIntern2($otherInstitute, $otherProgram, $hte->hte->id);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/coordinator/intern-evaluations/{$intern->uuid}")
        ->assertForbidden();
});

test('coordinator intern evaluations only includes hours_completed and completed interns', function () {
    $institute = coordEvalInstitute2();
    $program = coordEvalProgram2($institute);
    $coordinator = coordEvalCoordinator2($institute);
    $hte = coordEvalHte2($institute, $program);

    coordEvalIntern2($institute, $program, $hte->hte->id, 'hours_completed');
    coordEvalIntern2($institute, $program, $hte->hte->id, 'completed');
    coordEvalIntern2($institute, $program, $hte->hte->id, 'ongoing');
    coordEvalIntern2($institute, $program, $hte->hte->id, 'pending');
    coordEvalIntern2($institute, $program, $hte->hte->id, 'pending');

    $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-evaluations')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 2);
});
