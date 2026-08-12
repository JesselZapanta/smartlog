<?php

use App\Models\Institute;
use App\Models\Program;
use App\Models\User;
use App\Support\StorageUrl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('hte moa_url only points to files that exist on disk', function () {
    Storage::fake('public');
    $token = loginAsAdmin();
    $institute = Institute::create(['name' => 'Institute of Computing', 'is_active' => true]);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BSIT', 'is_active' => true]);

    $missing = User::factory()->create(['role' => 'hte']);
    $missing->hte()->create([
        'name' => 'Missing File Co.',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'moa' => 'moa/gone.pdf',
    ]);

    $existing = User::factory()->create(['role' => 'hte']);
    $path = UploadedFile::fake()->create('real.pdf', 100, 'application/pdf')->store('moa', 'public');
    $existing->hte()->create([
        'name' => 'Existing File Co.',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'moa' => $path,
    ]);

    $this->withToken($token)->getJson("/api/users/{$missing->uuid}/hte")
        ->assertOk()
        ->assertJsonPath('data.moa_url', null);

    $this->withToken($token)->getJson("/api/users/{$existing->uuid}/hte")
        ->assertOk()
        ->assertJsonPath('data.moa_url', StorageUrl::url($path));
});
