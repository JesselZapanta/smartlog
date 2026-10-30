<?php

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\DailyJournal;
use App\Models\EvaluationCriterion;
use App\Models\Hte;
use App\Models\HteEvaluation;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Issue;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Proves that after Phase 3 a re-enrolled intern's screens resolve the correct
 * term, rather than whichever row User::intern() happened to return.
 */
function tiInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function tiProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function tiTerm(string $code, string $description): AcademicTerm
{
    return AcademicTerm::create([
        'code' => $code,
        'description' => $description,
        'status' => 'inactive',
        'start_at' => now()->startOfYear()->addMonths($code === '251' ? 0 : 6),
    ]);
}

function tiHte(Institute $institute, Program $program): Hte
{
    $user = User::factory()->create(['role' => 'hte']);

    return Hte::create([
        'user_id' => $user->id,
        'name' => 'City Hall',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);
}

function tiCoordinator(Institute $institute, Program $program): User
{
    $user = User::factory()->create(['role' => 'ojt_coordinator']);
    Coordinator::create(['user_id' => $user->id, 'institute_id' => $institute->id, 'program_id' => $program->id]);

    return $user;
}

/**
 * `status` is deliberately absent from Intern::$fillable — it is only ever set
 * through forceFill in the registration/approval flows — so the fixture has to
 * do the same or the row silently falls back to the pending default.
 */
function tiEnrollment(User $user, AcademicTerm $term, Institute $institute, Program $program, Hte $hte, array $attributes = []): Intern
{
    $intern = new Intern([
        'user_id' => $user->id,
        'academic_year_id' => $term->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hte->id,
        'ojt_status' => 'ongoing',
    ]);

    $intern->forceFill(array_merge(['status' => 'approved'], $attributes))->save();

    return $intern;
}

/**
 * An intern enrolled in two terms, each with its own DTR, journal and issue.
 *
 * @return array{0: array<string, mixed>}
 */
function tiReenrolledIntern(): array
{
    $institute = tiInstitute();
    $program = tiProgram($institute);
    $hte = tiHte($institute, $program);

    $termA = tiTerm('251', 'First Semester');
    $termB = tiTerm('252', 'Second Semester');

    $user = User::factory()->create([
        'role' => 'intern',
        'firstname' => 'Juan',
        'middlename' => null,
        'lastname' => 'Dela Cruz',
        'extension' => null,
        'email_verified_at' => now(),
    ]);

    $first = tiEnrollment($user, $termA, $institute, $program, $hte, [
        'ojt_status' => 'completed',
        'grade' => 'Failed',
    ]);

    $second = tiEnrollment($user, $termB, $institute, $program, $hte, [
        'ojt_status' => 'ongoing',
        'grade' => null,
    ]);

    PhotoDtr::create(['intern_id' => $first->id, 'dtr_date' => '2026-01-10', 'status' => 'checked']);
    PhotoDtr::create(['intern_id' => $second->id, 'dtr_date' => '2026-06-10', 'status' => 'checked']);

    DailyJournal::create(['intern_id' => $first->id, 'date' => '2026-01-11', 'title' => 'Term one journal', 'journal' => 'a', 'status' => 'checked']);
    DailyJournal::create(['intern_id' => $second->id, 'date' => '2026-06-11', 'title' => 'Term two journal', 'journal' => 'b', 'status' => 'checked']);

    Issue::create(['intern_id' => $first->id, 'hte_id' => $hte->id, 'type' => 'intern', 'issues' => 'Term one issue', 'status' => 'resolve']);
    Issue::create(['intern_id' => $second->id, 'hte_id' => $hte->id, 'type' => 'intern', 'issues' => 'Term two issue', 'status' => 'pending']);

    return [
        'user' => $user,
        'first' => $first,
        'second' => $second,
        'termA' => $termA,
        'termB' => $termB,
        'institute' => $institute,
        'program' => $program,
        'hte' => $hte,
    ];
}

test('a re-enrolled intern resolves the newest term as their active enrollment', function () {
    ['user' => $user, 'first' => $first, 'second' => $second] = tiReenrolledIntern();

    expect($user->activeEnrollment()->id)->toBe($second->id)
        ->and($user->originalEnrollment()->id)->toBe($first->id);
});

test('enrollmentFor returns the requested term and falls back to active', function () {
    ['user' => $user, 'first' => $first, 'second' => $second, 'termA' => $termA] = tiReenrolledIntern();

    expect($user->enrollmentFor($termA->id)->id)->toBe($first->id)
        ->and($user->enrollmentFor(null)->id)->toBe($second->id)
        ->and($user->enrollmentFor(999999))->toBeNull();
});

test('the intern report returns only the active terms data by default', function () {
    ['user' => $user, 'termB' => $termB] = tiReenrolledIntern();

    $response = $this->actingAs($user, 'api')->getJson('/api/intern/reports')->assertOk();

    expect($response->json('data.academic_year.id'))->toBe($termB->id)
        ->and($response->json('data.dtr.rows'))->toHaveCount(1)
        ->and($response->json('data.dtr.rows.0.date'))->toBe('2026-06-10')
        ->and($response->json('data.journals.rows.0.title'))->toBe('Term two journal');
});

test('the intern report returns an older term when asked for it', function () {
    ['user' => $user, 'termA' => $termA] = tiReenrolledIntern();

    $response = $this->actingAs($user, 'api')
        ->getJson("/api/intern/reports?academic_year_id={$termA->id}")
        ->assertOk();

    expect($response->json('data.academic_year.id'))->toBe($termA->id)
        ->and($response->json('data.dtr.rows'))->toHaveCount(1)
        ->and($response->json('data.dtr.rows.0.date'))->toBe('2026-01-10')
        ->and($response->json('data.journals.rows.0.title'))->toBe('Term one journal');
});

test('intern issues are scoped to the active term', function () {
    ['user' => $user] = tiReenrolledIntern();

    $issues = $this->actingAs($user, 'api')->getJson('/api/intern/issues')->assertOk()->json('data');

    expect($issues)->toHaveCount(1)
        ->and($issues[0]['issues'])->toBe('Term two issue');
});

test('intern journals are scoped to the active term', function () {
    ['user' => $user] = tiReenrolledIntern();

    $journals = $this->actingAs($user, 'api')->getJson('/api/intern/journals')->assertOk()->json('data');

    expect($journals)->toHaveCount(1)
        ->and($journals[0]['title'])->toBe('Term two journal');
});

test('the intern evaluation screen resolves the active term', function () {
    ['user' => $user, 'first' => $first, 'second' => $second, 'hte' => $hte, 'institute' => $institute, 'program' => $program] = tiReenrolledIntern();

    // A second site and a later phase in the new term, so the response is only
    // correct if the controller followed academic_year_id rather than user_id.
    $newHte = tiHte($institute, $program);
    $second->forceFill(['assigned_hte' => $newHte->id, 'ojt_status' => 'hours_completed'])->save();

    $criterion = EvaluationCriterion::create([
        'institute_id' => $institute->id,
        'category' => 'work_characteristics',
        'indicator' => 'Meets deadlines',
        'type' => 'hte',
        'status' => 'active',
    ]);

    // A response logged in the OLD term must not bleed into the new one.
    HteEvaluation::create([
        'intern_id' => $first->id,
        'hte_id' => $hte->id,
        'criterion_id' => $criterion->id,
        'rating' => 5,
    ]);

    $response = $this->actingAs($user, 'api')->getJson('/api/intern/evaluations')->assertOk();

    expect($response->json('data.intern.id'))->toBe($second->id)
        ->and($response->json('data.hte.id'))->toBe($newHte->id)
        ->and($response->json('data.criteria'))->toHaveCount(1)
        ->and($response->json('data.criteria.0.rating'))->toBeNull();
});

test('the coordinator defaults the intern detail to the newest term', function () {
    ['user' => $user, 'institute' => $institute, 'program' => $program] = tiReenrolledIntern();
    $coordinator = tiCoordinator($institute, $program);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/registrations/interns/{$user->uuid}")
        ->assertOk()
        ->assertJsonPath('data.academic_year', 'Second Semester')
        ->assertJsonPath('data.ojt_status', 'ongoing');
});

test('the coordinator can pin an older term on the intern detail', function () {
    ['user' => $user, 'institute' => $institute, 'program' => $program, 'termA' => $termA] = tiReenrolledIntern();
    $coordinator = tiCoordinator($institute, $program);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/registrations/interns/{$user->uuid}?academic_year_id={$termA->id}")
        ->assertOk()
        ->assertJsonPath('data.academic_year', 'First Semester')
        ->assertJsonPath('data.ojt_status', 'completed');
});

test('the coordinator is refused an intern from another institute', function () {
    ['user' => $user] = tiReenrolledIntern();

    $otherInstitute = tiInstitute();
    $otherProgram = tiProgram($otherInstitute);
    $coordinator = tiCoordinator($otherInstitute, $otherProgram);

    $this->actingAs($coordinator, 'api')
        ->getJson("/api/registrations/interns/{$user->uuid}")
        ->assertForbidden();
});

test('the coordinator issues queue stays cross-term but institute scoped', function () {
    ['user' => $user, 'institute' => $institute, 'program' => $program] = tiReenrolledIntern();
    $coordinator = tiCoordinator($institute, $program);

    $rows = $this->actingAs($coordinator, 'api')
        ->getJson('/api/coordinator/intern-issues')
        ->assertOk()
        ->json('data');

    // The coordinator queue is an oversight view, so it intentionally keeps both
    // terms; term narrowing belongs to the per-intern and intern-facing screens.
    expect($rows)->toHaveCount(2)
        ->and(collect($rows)->pluck('issues')->all())->toContain('Term one issue')
        ->and(collect($rows)->pluck('issues')->all())->toContain('Term two issue');
});

test('admin deleting an intern removes every enrollment they hold', function () {
    ['user' => $user] = tiReenrolledIntern();
    $admin = User::factory()->create(['role' => 'admin']);

    expect(Intern::where('user_id', $user->id)->count())->toBe(2);

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/users/{$user->uuid}/intern")
        ->assertOk();

    expect(Intern::where('user_id', $user->id)->count())->toBe(0);
});

test('ojt hours are counted from the active term only', function () {
    ['user' => $user, 'first' => $first, 'second' => $second, 'institute' => $institute] = tiReenrolledIntern();
    declareOjtHours($first, 10);
    declareOjtHours($second, 10);

    // A full day of checked time in the *old* term must not inflate the new term.
    PhotoDtr::create([
        'intern_id' => $first->id,
        'dtr_date' => '2026-02-10',
        'am_in_time' => '08:00:00',
        'am_out_time' => '12:00:00',
        'status' => 'checked',
    ]);

    $payload = $this->actingAs($user, 'api')->getJson('/api/intern/ojt-hours')->assertOk()->json('data');

    expect($payload['earned_minutes'])->toBe(0)
        ->and($second->refresh()->earnedMinutes())->toBe(0)
        ->and($first->refresh()->earnedMinutes())->toBe(240);
});

test('grades stay attached to the term they were awarded in', function () {
    ['user' => $user, 'first' => $first, 'second' => $second] = tiReenrolledIntern();

    expect($first->refresh()->grade)->toBe('Failed')
        ->and($second->refresh()->grade)->toBeNull()
        ->and($user->originalEnrollment()->grade)->toBe('Failed')
        ->and($user->activeEnrollment()->grade)->toBeNull();
});
