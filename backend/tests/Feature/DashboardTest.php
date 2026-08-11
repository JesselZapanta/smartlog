<?php

use App\Models\AcademicTerm;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('dashboard requires authentication', function () {
    $this->getJson('/api/dashboard')->assertStatus(401);
});

test('admin dashboard exposes overview stats', function () {
    $institute = Institute::create(['name' => 'Institute of Computing']);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
    AcademicTerm::create(['code' => '2025-2026', 'description' => 'First Semester']);
    User::factory()->count(3)->create(['role' => 'intern']);
    User::factory()->create(['role' => 'intern', 'email_verified_at' => null]);
    User::factory()->count(2)->create(['role' => 'hte']);

    $response = $this->actingAs(User::factory()->create(['role' => 'admin']), 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.role', 'admin')
        ->assertJsonStructure([
            'data' => [
                'stats' => ['total_users', 'interns', 'htes', 'institutes', 'programs', 'academic_terms', 'unverified_users'],
                'role_breakdown',
                'recent_interns',
                'recent_htes',
            ],
        ]);

    expect($response->json('data.stats.interns'))->toBe(4);
    expect($response->json('data.stats.htes'))->toBe(2);
    expect($response->json('data.stats.unverified_users'))->toBe(1);
    expect($response->json('data.recent_interns'))->toHaveCount(4);
});

test('coordinator dashboard exposes intern and hte overview', function () {
    $institute = Institute::create(['name' => 'Institute of Computing']);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
    User::factory()->count(2)->create(['role' => 'intern']);
    $hteUsers = User::factory()->count(3)->create(['role' => 'hte']);
    foreach ($hteUsers as $hteUser) {
        Hte::create([
            'user_id' => $hteUser->id,
            'name' => fake()->company(),
            'institute_id' => $institute->id,
            'program_id' => $program->id,
            'status' => 'active',
        ]);
    }

    $this->actingAs(User::factory()->create(['role' => 'ojt_coordinator']), 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.role', 'ojt_coordinator')
        ->assertJsonStructure([
            'data' => [
                'stats' => ['interns', 'verified_interns', 'htes', 'programs'],
                'recent_interns',
                'htes',
            ],
        ])
        ->assertJsonPath('data.stats.interns', 2)
        ->assertJsonPath('data.stats.htes', 3)
        ->assertJsonPath('data.htes', fn (array $htes) => count($htes) === 3);
});

test('instructor dashboard includes intern count per program', function () {
    $institute = Institute::create(['name' => 'Institute of Computing']);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
    $term = AcademicTerm::create(['code' => '2025-2026', 'description' => 'First Semester']);

    $intern = User::factory()->create(['role' => 'intern']);
    Intern::create([
        'user_id' => $intern->id,
        'program_id' => $program->id,
        'institute_id' => $institute->id,
        'academic_year_id' => $term->id,
    ]);

    $this->actingAs(User::factory()->create(['role' => 'ojt_instructor']), 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'stats' => ['interns', 'verified_interns', 'htes', 'programs'],
                'programs',
                'recent_interns',
            ],
        ])
        ->assertJsonPath('data.programs.0.name', $program->name)
        ->assertJsonPath('data.programs.0.intern_count', 1);
});

test('intern dashboard exposes profile and intern record', function () {
    $institute = Institute::create(['name' => 'Institute of Computing']);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
    $term = AcademicTerm::create(['code' => '2025-2026', 'description' => 'First Semester']);

    $intern = User::factory()->create(['role' => 'intern']);
    Intern::create([
        'user_id' => $intern->id,
        'program_id' => $program->id,
        'institute_id' => $institute->id,
        'academic_year_id' => $term->id,
        'practicum_instructor' => 'Prof. Santos',
    ]);

    $this->actingAs($intern, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.role', 'intern')
        ->assertJsonPath('data.user.uuid', $intern->uuid)
        ->assertJsonStructure([
            'data' => [
                'user' => ['uuid', 'full_name', 'email', 'role', 'email_verified_at'],
                'intern' => ['institute', 'program', 'academic_year', 'practicum_instructor', 'date_of_birth'],
            ],
        ])
        ->assertJsonPath('data.intern.program', $program->name)
        ->assertJsonPath('data.intern.academic_year', $term->code)
        ->assertJsonPath('data.intern.practicum_instructor', 'Prof. Santos');
});

test('intern dashboard tolerates a missing intern record', function () {
    $intern = User::factory()->create(['role' => 'intern']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.intern', null);
});

test('hte dashboard exposes organization profile', function () {
    $institute = Institute::create(['name' => 'Institute of Computing']);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);

    $user = User::factory()->create(['role' => 'hte']);
    Hte::create([
        'user_id' => $user->id,
        'name' => 'City Hall — ICT Office',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
        'start_at' => now()->subMonth(),
        'end_at' => now()->addMonths(5),
    ]);

    $this->actingAs($user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.role', 'hte')
        ->assertJsonStructure([
            'data' => [
                'user' => ['uuid', 'full_name', 'email', 'role'],
                'hte' => ['name', 'institute', 'program', 'status', 'start_at', 'end_at', 'has_moa'],
            ],
        ])
        ->assertJsonPath('data.hte.name', 'City Hall — ICT Office')
        ->assertJsonPath('data.hte.status', 'active')
        ->assertJsonPath('data.hte.has_moa', false);
});

test('hte dashboard tolerates a missing hte record', function () {
    $user = User::factory()->create(['role' => 'hte']);

    $this->actingAs($user, 'api')
        ->getJson('/api/dashboard')
        ->assertOk()
        ->assertJsonPath('data.hte', null);
});
