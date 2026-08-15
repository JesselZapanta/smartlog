<?php

use App\Models\Institute;
use App\Models\Program;
use App\Models\User;
use App\Support\StorageUrl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function loginAsAdmin(): string
{
    $admin = User::factory()->create(['role' => 'admin']);

    return auth()->guard('api')->login($admin);
}

test('an admin can upload a profile picture when creating a user', function () {
    Storage::fake('public');
    $token = loginAsAdmin();

    $response = $this->withToken($token)->postJson('/api/users', [
        'firstname' => 'Juan',
        'lastname' => 'Dela Cruz',
        'role' => 'intern',
        'email' => 'juan@smartlog.test',
        'password' => 'password',
        'password_confirmation' => 'password',
        'profile_picture' => UploadedFile::fake()->image('avatar.jpg', 1200, 900),
    ]);

    $response->assertStatus(201);

    $user = User::where('email', 'juan@smartlog.test')->first();

    expect($user)->not->toBeNull();
    expect($user->profile_picture)->not->toBeNull();
    expect($user->profile_picture)->toEndWith('.webp');
    Storage::disk('public')->assertExists($user->profile_picture);

    [$width, $height] = getimagesize(Storage::disk('public')->path($user->profile_picture));
    expect($width <= 512)->toBeTrue();
    expect($height <= 512)->toBeTrue();

    $response->assertJsonPath('data.profile_picture', StorageUrl::url($user->profile_picture));
});

test('an admin can replace a profile picture when updating a user', function () {
    Storage::fake('public');
    $old = UploadedFile::fake()->image('old.jpg')->store('avatars', 'public');
    $user = User::factory()->create(['role' => 'intern', 'profile_picture' => $old]);
    $token = loginAsAdmin();

    $response = $this->withToken($token)->putJson("/api/users/{$user->uuid}", [
        'firstname' => $user->firstname,
        'lastname' => $user->lastname,
        'role' => $user->role,
        'email' => $user->email,
        'profile_picture' => UploadedFile::fake()->image('new.jpg'),
    ]);

    $response->assertOk();

    $user->refresh();

    expect($user->profile_picture)->not->toBe($old);
    Storage::disk('public')->assertExists($user->profile_picture);
    Storage::disk('public')->assertMissing($old);
    $response->assertJsonPath('data.profile_picture', StorageUrl::url($user->profile_picture));
});

test('a non-image profile picture is rejected', function () {
    Storage::fake('public');
    $token = loginAsAdmin();

    $response = $this->withToken($token)->postJson('/api/users', [
        'firstname' => 'Juan',
        'lastname' => 'Dela Cruz',
        'role' => 'intern',
        'email' => 'juan@smartlog.test',
        'password' => 'password',
        'password_confirmation' => 'password',
        'profile_picture' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors('profile_picture');

    expect(User::where('email', 'juan@smartlog.test')->exists())->toBeFalse();
});

test('updating a user without a profile picture keeps the existing one', function () {
    Storage::fake('public');
    $existing = UploadedFile::fake()->image('existing.jpg')->store('avatars', 'public');
    $user = User::factory()->create(['role' => 'intern', 'profile_picture' => $existing]);
    $token = loginAsAdmin();

    $this->withToken($token)->putJson("/api/users/{$user->uuid}", [
        'firstname' => $user->firstname,
        'lastname' => $user->lastname,
        'role' => $user->role,
        'email' => $user->email,
    ])->assertOk();

    $user->refresh();

    expect($user->profile_picture)->toBe($existing);
    Storage::disk('public')->assertExists($existing);
});

test('deleting a user removes the stored profile picture', function () {
    Storage::fake('public');
    $avatar = UploadedFile::fake()->image('avatar.jpg')->store('avatars', 'public');
    $user = User::factory()->create(['role' => 'intern', 'profile_picture' => $avatar]);
    $token = loginAsAdmin();

    $this->withToken($token)->deleteJson("/api/users/{$user->uuid}")->assertOk();

    Storage::disk('public')->assertMissing($avatar);
    expect(User::find($user->id))->toBeNull();
});

test('a spoofed multipart update via POST with _method PUT updates the user and replaces the avatar', function () {
    Storage::fake('public');
    $old = UploadedFile::fake()->image('old.jpg')->store('avatars', 'public');
    $user = User::factory()->create(['role' => 'intern', 'profile_picture' => $old]);
    $token = loginAsAdmin();

    $response = $this->withToken($token)->post("/api/users/{$user->uuid}", [
        '_method' => 'PUT',
        'firstname' => 'Updated',
        'lastname' => $user->lastname,
        'role' => $user->role,
        'email' => $user->email,
        'profile_picture' => UploadedFile::fake()->image('new.jpg'),
    ]);

    $response->assertOk();

    $user->refresh();

    expect($user->firstname)->toBe('Updated');
    expect($user->profile_picture)->not->toBe($old);
    Storage::disk('public')->assertExists($user->profile_picture);
    Storage::disk('public')->assertMissing($old);
    $response->assertJsonPath('data.profile_picture', StorageUrl::url($user->profile_picture));
});

test('a spoofed multipart update via POST with _method PUT stores the MOA and the HTE text fields', function () {
    Storage::fake('public');
    $institute = Institute::create(['name' => 'Institute of Computing', 'is_active' => true]);
    $program = Program::create(['institute_id' => $institute->id, 'name' => 'BSIT', 'is_active' => true]);
    $user = User::factory()->create(['role' => 'hte']);
    $token = loginAsAdmin();

    $response = $this->withToken($token)->post("/api/users/{$user->uuid}/hte", [
        '_method' => 'PUT',
        'name' => 'Tangub City Global College',
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'moa' => UploadedFile::fake()->create('moa.pdf', 100, 'application/pdf'),
        'start_at' => '2026-08-01',
        'end_at' => '2027-07-31',
    ]);

    $response->assertOk();

    $user->refresh();

    expect($user->hte)->not->toBeNull();
    expect($user->hte->name)->toBe('Tangub City Global College');
    expect($user->hte->moa)->not->toBeNull();
    Storage::disk('public')->assertExists($user->hte->moa);
});
