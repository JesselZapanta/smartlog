<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\InternHteAssignment;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function placementInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function placementProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function placementAcademicTerm(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(
        ['code' => '2025-2026'],
        ['description' => 'First Semester']
    );
}

function placementHte(Institute $institute, Program $program, string $name): User
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

function placementCoordinator(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create([
        'user_id' => $user->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    return $user;
}

function placementIntern(Institute $institute, Program $program, ?int $hteId = null, array $attributes = []): Intern
{
    $user = User::factory()->create(['role' => 'intern']);

    $intern = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => placementAcademicTerm()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hteId,
        'ojt_status' => 'pending',
        ...$attributes,
    ]);

    // `status` is not mass assignable on Intern.
    $intern->forceFill(['status' => 'approved'])->save();

    return $intern;
}

test('creating an intern with an assigned hte records an open placement', function () {
    $institute = placementInstitute();
    $program = placementProgram($institute);
    $hte = placementHte($institute, $program, 'City Hall');

    $intern = placementIntern($institute, $program, $hte->hte->id);

    $placement = InternHteAssignment::where('intern_id', $intern->id)->sole();

    expect($placement->hte_id)->toBe($hte->hte->id);
    expect($placement->academic_year_id)->toBe($intern->academic_year_id);
    expect($placement->isActive())->toBeTrue();
    expect($placement->deployed_at)->toBeNull();
    expect($placement->requirements_customized_at)->toBeNull();
});

test('saving an intern without touching the assignment keeps a single placement', function () {
    $institute = placementInstitute();
    $program = placementProgram($institute);
    $hte = placementHte($institute, $program, 'City Hall');

    $intern = placementIntern($institute, $program, $hte->hte->id);

    $intern->forceFill(['ojt_status' => 'ongoing'])->save();
    $intern->save();

    expect(InternHteAssignment::where('intern_id', $intern->id)->count())->toBe(1);
});

test('moving an intern to another hte closes the old placement and opens a new one', function () {
    $institute = placementInstitute();
    $program = placementProgram($institute);
    $first = placementHte($institute, $program, 'City Hall');
    $second = placementHte($institute, $program, 'Barangay Office');

    $intern = placementIntern($institute, $program, $first->hte->id);

    $intern->forceFill(['assigned_hte' => $second->hte->id])->save();

    $placements = InternHteAssignment::where('intern_id', $intern->id)
        ->orderBy('id')
        ->get();

    expect($placements)->toHaveCount(2);
    expect($placements[0]->hte_id)->toBe($first->hte->id);
    expect($placements[0]->isActive())->toBeFalse();
    expect($placements[0]->unassigned_at)->not->toBeNull();
    expect($placements[1]->hte_id)->toBe($second->hte->id);
    expect($placements[1]->isActive())->toBeTrue();

    expect($intern->activePlacement()?->id)->toBe($placements[1]->id);
});

test('releasing an intern closes their open placement', function () {
    $institute = placementInstitute();
    $program = placementProgram($institute);
    $hte = placementHte($institute, $program, 'City Hall');

    $intern = placementIntern($institute, $program, $hte->hte->id);

    $intern->forceFill(['assigned_hte' => null])->save();

    $placement = InternHteAssignment::where('intern_id', $intern->id)->sole();

    expect($placement->isActive())->toBeFalse();
    expect($placement->unassigned_at)->not->toBeNull();
    expect($intern->activePlacement())->toBeNull();
});

test('coordinator assignment through the api records an open placement', function () {
    $institute = placementInstitute();
    $program = placementProgram($institute);
    $hte = placementHte($institute, $program, 'City Hall');
    $coordinator = placementCoordinator($institute, $program);
    $intern = placementIntern($institute, $program);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/htes/{$hte->uuid}/assign", [
            'academic_year_id' => placementAcademicTerm()->id,
            'intern_ids' => [$intern->id],
        ])
        ->assertOk();

    $placement = InternHteAssignment::where('intern_id', $intern->id)->sole();

    expect($placement->hte_id)->toBe($hte->hte->id);
    expect($placement->assigned_by)->toBe($coordinator->id);
    expect($placement->isActive())->toBeTrue();
});

test('coordinator unassignment through the api closes the placement', function () {
    $institute = placementInstitute();
    $program = placementProgram($institute);
    $hte = placementHte($institute, $program, 'City Hall');
    $coordinator = placementCoordinator($institute, $program);
    $intern = placementIntern($institute, $program, $hte->hte->id);

    $this->actingAs($coordinator, 'api')
        ->postJson("/api/coordinator/htes/{$hte->uuid}/unassign", [
            'academic_year_id' => placementAcademicTerm()->id,
            'intern_ids' => [$intern->id],
        ])
        ->assertOk();

    $placement = InternHteAssignment::where('intern_id', $intern->id)->sole();

    expect($placement->isActive())->toBeFalse();
    expect($placement->unassigned_by)->toBe($coordinator->id);
});
