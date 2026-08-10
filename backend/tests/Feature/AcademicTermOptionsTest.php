<?php

use App\Models\AcademicTerm;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('academic term options are available to authenticated users and include all terms', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $newest = AcademicTerm::create([
        'code' => '2026-2027',
        'description' => 'SY 2026-2027',
        'status' => 'active',
        'start_at' => '2026-08-01 00:00:00',
        'end_at' => '2027-07-31 00:00:00',
    ]);
    AcademicTerm::create([
        'code' => '2025-2026',
        'description' => 'SY 2025-2026',
        'status' => 'inactive',
        'start_at' => '2025-08-01 00:00:00',
        'end_at' => '2026-07-31 00:00:00',
    ]);

    $this->actingAs($user, 'api')
        ->getJson('/api/academic-terms/options')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $newest->id)
        ->assertJsonPath('data.0.description', 'SY 2026-2027')
        ->assertJsonPath('data.1.description', 'SY 2025-2026');
});

test('academic term options require authentication', function () {
    $this->getJson('/api/academic-terms/options')->assertUnauthorized();
});
