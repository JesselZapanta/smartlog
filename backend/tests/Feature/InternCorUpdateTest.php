<?php

use App\Models\AcademicTerm;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use App\Support\StorageUrl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function corPayload(Institute $institute, Program $program, array $extra = []): array
{
    return array_merge([
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'date_of_birth' => '2000-05-05',
        'place_of_birth' => 'Ozamiz City',
        'fathers_name' => 'Pedro Dela Cruz',
        'fathers_occupation' => 'Farmer',
        'fathers_contact' => '09170000000',
        'mothers_name' => 'Juana Dela Cruz',
        'mothers_occupation' => 'Teacher',
        'mothers_contact' => '09170000001',
        'parents_guardian_address' => 'Brgy. Mantic, Tangub City',
        'practicum_instructor' => 'Prof. Reyes',
    ], $extra);
}

test('an admin can upload a COR pdf to an intern record', function () {
    Storage::fake('public');
    $token = loginAsAdmin();
    $institute = Institute::create(['name' => 'Institute of Computing', 'is_active' => true]);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BSIT', 'is_active' => true]);
    $intern = User::factory()->create(['role' => 'intern']);
    Intern::create([
        'user_id' => $intern->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    $response = $this->withToken($token)->put(
        "/api/users/{$intern->uuid}/intern",
        corPayload($institute, $program, ['cor' => UploadedFile::fake()->create('cor.pdf', 512, 'application/pdf')]),
        ['Accept' => 'application/json']
    );

    $response->assertOk();

    $intern->refresh();
    expect($intern->intern->cor_path)->not->toBeNull();
    Storage::disk('public')->assertExists($intern->intern->cor_path);
    $response->assertJsonPath('data.cor', StorageUrl::url($intern->intern->cor_path));
});

test('uploading a new COR replaces the previous file on disk', function () {
    Storage::fake('public');
    $token = loginAsAdmin();
    $institute = Institute::create(['name' => 'Institute of Computing', 'is_active' => true]);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BSIT', 'is_active' => true]);
    $intern = User::factory()->create(['role' => 'intern']);
    $internRecord = Intern::create([
        'user_id' => $intern->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);
    $oldPath = UploadedFile::fake()->create('old-cor.pdf', 512, 'application/pdf')->store('cor', 'public');
    $internRecord->update(['cor_path' => $oldPath]);

    $this->withToken($token)->put(
        "/api/users/{$intern->uuid}/intern",
        corPayload($institute, $program, ['cor' => UploadedFile::fake()->create('new-cor.pdf', 512, 'application/pdf')]),
        ['Accept' => 'application/json']
    )->assertOk();

    $intern->refresh();
    expect($intern->intern->cor_path)->not->toBe($oldPath);
    Storage::disk('public')->assertExists($intern->intern->cor_path);
    Storage::disk('public')->assertMissing($oldPath);
});

test('a COR upload only accepts pdf files', function () {
    Storage::fake('public');
    $token = loginAsAdmin();
    $institute = Institute::create(['name' => 'Institute of Computing', 'is_active' => true]);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BSIT', 'is_active' => true]);
    $intern = User::factory()->create(['role' => 'intern']);

    $this->withToken($token)->put(
        "/api/users/{$intern->uuid}/intern",
        corPayload($institute, $program, ['cor' => UploadedFile::fake()->create('cor.txt', 512, 'text/plain')]),
        ['Accept' => 'application/json']
    )
        ->assertStatus(422)
        ->assertJsonValidationErrors('cor');
});
