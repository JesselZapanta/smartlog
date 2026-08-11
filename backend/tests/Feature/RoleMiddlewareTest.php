<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin-only routes are forbidden for non-admin roles', function (string $role) {
    $this->actingAs(User::factory()->create(['role' => $role]), 'api')
        ->getJson('/api/users')
        ->assertStatus(403);
})->with(['intern', 'ojt_instructor', 'ojt_coordinator', 'hte']);

test('admin-only routes work for admins', function () {
    $this->actingAs(User::factory()->create(['role' => 'admin']), 'api')
        ->getJson('/api/users')
        ->assertOk();
});

test('coordinator-only routes are forbidden for other roles', function (string $role) {
    $this->actingAs(User::factory()->create(['role' => $role]), 'api')
        ->getJson('/api/registrations/pending')
        ->assertStatus(403);
})->with(['admin', 'ojt_instructor', 'intern', 'hte']);

test('intern-only routes are forbidden for other roles', function (string $role) {
    $this->actingAs(User::factory()->create(['role' => $role]), 'api')
        ->getJson('/api/my-registration')
        ->assertStatus(403);
})->with(['admin', 'ojt_instructor', 'ojt_coordinator', 'hte']);

test('shared authenticated routes still work for every role', function (string $role) {
    $this->actingAs(User::factory()->create(['role' => $role]), 'api')
        ->getJson('/api/dashboard')
        ->assertOk();
})->with(['admin', 'ojt_instructor', 'ojt_coordinator', 'intern', 'hte']);

test('role routes still require authentication', function () {
    $this->getJson('/api/registrations/pending')->assertUnauthorized();
});
