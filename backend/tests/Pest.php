<?php

use App\Models\Intern;
use App\Models\OjtEnrollment;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(TestCase::class)
    // ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Model Cache
|--------------------------------------------------------------------------
|
| `Intern` caches the term enrollment applications it resolves through a static
| array so list endpoints avoid a query per row. The test process outlives a
| single request, so that cache has to be dropped between tests or one test's
| prefetched rows leak into the next. RefreshDatabase hands ids back out from 1,
| so a leaked entry matches the *next* test's intern and is not merely wasted.
|
| Suite-wide hooks must be registered through `uses()`, not a bare
| `beforeEach()` in this file, or they do not reach the Feature tests.
|
*/

uses()->beforeEach(function () {
    Intern::flushTermEnrollmentCache();
})->in('Feature');

/**
 * Declare the OJT hours for an enrollment, as an approved application would.
 *
 * `ojt_enrollments.ojt_hours` is the single source for a term's requirement, so tests
 * that need a target to measure against create an enrollment rather than an
 * institute-wide configuration row.
 */
function declareOjtHours(Intern $intern, int $hours): OjtEnrollment
{
    return OjtEnrollment::create([
        'user_id' => $intern->user_id,
        'academic_year_id' => $intern->academic_year_id,
        'institute_id' => $intern->institute_id,
        'program_id' => $intern->program_id,
        'ojt_hours' => $hours,
        'status' => 'approved',
    ]);
}

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function something()
{
    // ..
}
