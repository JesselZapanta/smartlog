<?php

use App\Models\AcademicTerm;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternEvaluation;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function instEvalInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function instEvalProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function instEvalHte(Institute $institute, Program $program, string $name): User
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

function instEvalIntern(Institute $institute, Program $program, int $hteId, string $ojtStatus = 'hours_completed'): User
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

function instEvalCriterion(Institute $institute, string $category, string $indicator): EvaluationCriterion
{
    return EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => $category,
        'indicator' => $indicator,
        'type' => 'intern',
        'status' => 'active',
    ]);
}

test('instructor sees every placement with responses and the blended average', function () {
    $institute = instEvalInstitute();
    $program = instEvalProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $oldHost = instEvalHte($institute, $program, 'Old Host');
    $newHost = instEvalHte($institute, $program, 'New Host');
    $internUser = instEvalIntern($institute, $program, $oldHost->hte->id);
    $intern = $internUser->intern;

    $personal = instEvalCriterion($institute, 'personal_characteristics', 'Personal one');
    $work = instEvalCriterion($institute, 'work_characteristics', 'Work one');
    $job = instEvalCriterion($institute, 'job_knowledge', 'Job one');

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
    $intern->forceFill(['assigned_hte' => $newHost->hte->id])->save();

    // New placement: all 2s → weighted 2.0.
    $answer($newHost->hte->id, [2, 2, 2]);

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/intern-evaluations/{$internUser->uuid}")
        ->assertOk()
        ->assertJsonCount(2, 'data.placements')
        ->assertJsonPath('data.placements.0.hte.name', 'Old Host')
        ->assertJsonPath('data.placements.0.is_current', false)
        ->assertJsonPath('data.placements.0.summary.complete', true)
        ->assertJsonPath('data.placements.0.summary.weighted_average', 4.4)
        ->assertJsonPath("data.placements.0.responses.{$personal->id}.rating", 4)
        ->assertJsonPath('data.placements.1.hte.name', 'New Host')
        ->assertJsonPath('data.placements.1.is_current', true)
        ->assertJsonPath('data.placements.1.summary.weighted_average', 2)
        ->assertJsonPath('data.blended_average', 3.2)
        ->assertJsonPath('data.blended_placements', 2);

    // The list blends every placement too, and progress aggregates across
    // them (3 criteria × 2 placements).
    $this->actingAs($instructor, 'api')
        ->getJson('/api/instructor/intern-evaluations')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.evaluation.total', 6)
        ->assertJsonPath('data.0.evaluation.answered', 6)
        ->assertJsonPath('data.0.evaluation.status', 'completed')
        ->assertJsonPath('data.0.evaluation.weighted_average', 3.2);
});

test('instructor cannot view an intern evaluation for an ongoing intern', function () {
    $institute = instEvalInstitute();
    $program = instEvalProgram($institute);
    $instructor = User::factory()->create(['role' => 'ojt_instructor']);
    $hte = instEvalHte($institute, $program, 'Host');
    $internUser = instEvalIntern($institute, $program, $hte->hte->id, 'ongoing');

    $this->actingAs($instructor, 'api')
        ->getJson("/api/instructor/intern-evaluations/{$internUser->uuid}")
        ->assertNotFound();
});
