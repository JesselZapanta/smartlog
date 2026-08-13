<?php

use App\Models\Hte;
use App\Models\Institute;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function hteModuleInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function hteModuleProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function hteModuleAdmin(): User
{
    return User::factory()->create(['role' => 'admin']);
}

function hteModuleUser(Institute $institute, Program $program, array $attributes = [], array $userAttributes = []): User
{
    $user = User::factory()->create(['role' => 'hte', ...$userAttributes]);
    Hte::create([
        'user_id' => $user->id,
        'name' => $attributes['name'] ?? 'Tangub City Hall',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'moa' => null,
        'start_at' => '2026-08-01 00:00:00',
        'end_at' => '2026-12-31 00:00:00',
        'status' => $attributes['status'] ?? 'active',
    ]);

    return $user;
}

test('admin can list htes with pagination meta', function () {
    $institute = hteModuleInstitute();
    $program = hteModuleProgram($institute);
    hteModuleUser($institute, $program);

    $this->actingAs(hteModuleAdmin(), 'api')
        ->getJson('/api/htes')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                ['id', 'uuid', 'name', 'contact_person', 'email', 'institute', 'program', 'status', 'created_at'],
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
        ])
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.name', 'Tangub City Hall');
});

test('admin can search htes by name or contact email', function () {
    $institute = hteModuleInstitute();
    $program = hteModuleProgram($institute);
    hteModuleUser($institute, $program, ['name' => 'City Hall'], ['email' => 'hall@smartlog.test']);
    hteModuleUser($institute, $program, ['name' => 'Rural Health Unit'], ['email' => 'rhu@smartlog.test']);

    $this->actingAs(hteModuleAdmin(), 'api')
        ->getJson('/api/htes?search=rhu')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.name', 'Rural Health Unit');
});

test('admin can filter htes by status and institute', function () {
    $institute = hteModuleInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    $program = hteModuleProgram($institute);
    hteModuleUser($institute, $program, ['status' => 'inactive'], ['email' => 'inactive@smartlog.test']);
    $active = hteModuleUser($institute, $program, ['status' => 'active'], ['email' => 'active@smartlog.test']);

    $this->actingAs(hteModuleAdmin(), 'api')
        ->getJson('/api/htes?status=active')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.uuid', $active->uuid);

    $this->actingAs(hteModuleAdmin(), 'api')
        ->getJson('/api/htes?institute_id='.$otherInstitute->id)
        ->assertOk()
        ->assertJsonPath('meta.total', 0);
});

test('admin can view hte details', function () {
    $institute = hteModuleInstitute();
    $program = hteModuleProgram($institute);
    $hteUser = hteModuleUser($institute, $program, ['name' => 'City Health Office'], ['email' => 'cho@smartlog.test']);

    $this->actingAs(hteModuleAdmin(), 'api')
        ->getJson("/api/htes/{$hteUser->uuid}")
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id', 'uuid', 'name', 'contact_person', 'email', 'contact_number', 'institute',
                'program', 'moa', 'moa_url', 'start_at', 'end_at', 'location', 'status', 'created_at',
            ],
        ])
        ->assertJsonPath('data.uuid', $hteUser->uuid)
        ->assertJsonPath('data.name', 'City Health Office')
        ->assertJsonPath('data.status', 'active');
});

test('hte detail returns 404 for a user without an hte record', function () {
    $user = User::factory()->create(['role' => 'intern']);

    $this->actingAs(hteModuleAdmin(), 'api')
        ->getJson("/api/htes/{$user->uuid}")
        ->assertNotFound();
});

test('hte module is admin only', function () {
    $institute = hteModuleInstitute();
    $program = hteModuleProgram($institute);
    hteModuleUser($institute, $program);

    $intern = User::factory()->create(['role' => 'intern']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/htes')
        ->assertForbidden();
});
