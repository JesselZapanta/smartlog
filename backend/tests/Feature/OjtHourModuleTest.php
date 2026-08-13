<?php

use App\Models\Institute;
use App\Models\OjtHour;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function ojtHoursInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function ojtHoursAdmin(): User
{
    return User::factory()->create(['role' => 'admin']);
}

test('admin can list ojt hours with pagination meta', function () {
    $institute = ojtHoursInstitute();
    OjtHour::create(['institute_id' => $institute->id, 'hours' => 486]);

    $this->actingAs(ojtHoursAdmin(), 'api')
        ->getJson('/api/ojt-hours')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                ['id', 'institute_id', 'institute', 'hours', 'created_at', 'updated_at'],
            ],
            'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to'],
        ])
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.hours', 486)
        ->assertJsonPath('data.0.institute.name', 'Institute of Computing');
});

test('admin can search ojt hours by institute name', function () {
    $institute = ojtHoursInstitute();
    $otherInstitute = Institute::create(['name' => 'Institute of Education']);
    OjtHour::create(['institute_id' => $institute->id, 'hours' => 486]);
    OjtHour::create(['institute_id' => $otherInstitute->id, 'hours' => 600]);

    $this->actingAs(ojtHoursAdmin(), 'api')
        ->getJson('/api/ojt-hours?search=computing')
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.institute.name', 'Institute of Computing');
});

test('admin can create ojt hours for an institute', function () {
    $institute = ojtHoursInstitute();

    $this->actingAs(ojtHoursAdmin(), 'api')
        ->postJson('/api/ojt-hours', [
            'institute_id' => $institute->id,
            'hours' => 486,
        ])
        ->assertCreated()
        ->assertJsonPath('data.hours', 486)
        ->assertJsonPath('data.institute_id', $institute->id);

    expect(OjtHour::count())->toBe(1);
});

test('ojt hours must be unique per institute', function () {
    $institute = ojtHoursInstitute();
    OjtHour::create(['institute_id' => $institute->id, 'hours' => 486]);

    $this->actingAs(ojtHoursAdmin(), 'api')
        ->postJson('/api/ojt-hours', [
            'institute_id' => $institute->id,
            'hours' => 500,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('institute_id');
});

test('admin can update ojt hours', function () {
    $institute = ojtHoursInstitute();
    $ojtHour = OjtHour::create(['institute_id' => $institute->id, 'hours' => 486]);

    $this->actingAs(ojtHoursAdmin(), 'api')
        ->putJson("/api/ojt-hours/{$ojtHour->id}", [
            'institute_id' => $institute->id,
            'hours' => 600,
        ])
        ->assertOk()
        ->assertJsonPath('data.hours', 600);
});

test('admin can delete ojt hours', function () {
    $institute = ojtHoursInstitute();
    $ojtHour = OjtHour::create(['institute_id' => $institute->id, 'hours' => 486]);

    $this->actingAs(ojtHoursAdmin(), 'api')
        ->deleteJson("/api/ojt-hours/{$ojtHour->id}")
        ->assertOk();

    expect(OjtHour::count())->toBe(0);
});

test('ojt hours module is admin only', function () {
    $institute = ojtHoursInstitute();
    OjtHour::create(['institute_id' => $institute->id, 'hours' => 486]);

    $intern = User::factory()->create(['role' => 'intern']);

    $this->actingAs($intern, 'api')
        ->getJson('/api/ojt-hours')
        ->assertForbidden();
});
