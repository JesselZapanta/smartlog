<?php

use App\Models\AcademicTerm;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function dtrInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function dtrProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function dtrIntern(Institute $institute, Program $program, array $attributes = []): User
{
    $user = User::factory()->create(['role' => 'intern', ...$attributes]);
    $record = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => AcademicTerm::firstOrCreate(['code' => '2025-2026'], ['description' => 'First Semester'])->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
    ]);

    $record->forceFill(['status' => 'approved'])->save();

    return $user;
}

function dtrPhoto(): UploadedFile
{
    return UploadedFile::fake()->image('punch.jpg', 400, 400);
}

test('intern can punch a slot with a photo', function () {
    Storage::fake('public');
    $this->travelTo(Carbon::parse('2026-08-15 08:00:00'));
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', [
            'slot' => 'am_in',
            'photo' => dtrPhoto(),
        ])
        ->assertOk()
        ->assertJsonPath('data.dtr_date', now()->toDateString())
        ->assertJsonPath('data.slots.am_in.time', now()->format('H:i:s'))
        ->assertJsonPath('data.status', 'pending');

    $record = PhotoDtr::first();
    expect($record)->not->toBeNull();
    expect($record->am_in_time)->toBe(now()->format('H:i:s'));
    expect($record->am_in_photo)->not->toBeNull();
    expect($record->am_out_time)->toBeNull();
    Storage::disk('public')->assertExists($record->am_in_photo);
});

test('intern can punch all four slots on the same day in one record', function () {
    Storage::fake('public');
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->travelTo(Carbon::parse('2026-08-15 08:00:00'));
    foreach (['am_in', 'am_out'] as $slot) {
        $this->actingAs($intern, 'api')
            ->postJson('/api/intern/photo-dtr/punch', [
                'slot' => $slot,
                'photo' => dtrPhoto(),
            ])
            ->assertOk();
    }

    $this->travelTo(Carbon::parse('2026-08-15 13:00:00'));
    foreach (['pm_in', 'pm_out'] as $slot) {
        $this->actingAs($intern, 'api')
            ->postJson('/api/intern/photo-dtr/punch', [
                'slot' => $slot,
                'photo' => dtrPhoto(),
            ])
            ->assertOk();
    }

    expect(PhotoDtr::count())->toBe(1);
    $record = PhotoDtr::first();
    expect($record->am_in_time)->not->toBeNull();
    expect($record->am_out_time)->not->toBeNull();
    expect($record->pm_in_time)->not->toBeNull();
    expect($record->pm_out_time)->not->toBeNull();
    expect(PhotoDtr::whereNotNull('am_in_photo')->whereNotNull('am_out_photo')->whereNotNull('pm_in_photo')->whereNotNull('pm_out_photo')->count())->toBe(1);
});

test('re-punching a slot replaces the photo and resets the status to pending', function () {
    Storage::fake('public');
    $this->travelTo(Carbon::parse('2026-08-15 08:00:00'));
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_in', 'photo' => dtrPhoto()])->assertOk();
    $oldPath = PhotoDtr::first()->am_in_photo;
    PhotoDtr::query()->update(['status' => 'verified']);

    $this->actingAs($intern, 'api')->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_in', 'photo' => dtrPhoto()])->assertOk();

    $record = PhotoDtr::first();
    expect($record->status)->toBe('pending');
    expect($record->am_in_photo)->not->toBe($oldPath);
    Storage::disk('public')->assertMissing($oldPath);
});

test('retaking any slot does not create a second record for the same day', function () {
    Storage::fake('public');
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->travelTo(Carbon::parse('2026-08-15 08:00:00'));
    foreach (['am_in', 'am_out'] as $slot) {
        $this->actingAs($intern, 'api')->postJson('/api/intern/photo-dtr/punch', ['slot' => $slot, 'photo' => dtrPhoto()])->assertOk();
        $this->actingAs($intern, 'api')->postJson('/api/intern/photo-dtr/punch', ['slot' => $slot, 'photo' => dtrPhoto()])->assertOk();
    }

    $this->travelTo(Carbon::parse('2026-08-15 13:00:00'));
    foreach (['pm_in', 'pm_out'] as $slot) {
        $this->actingAs($intern, 'api')->postJson('/api/intern/photo-dtr/punch', ['slot' => $slot, 'photo' => dtrPhoto()])->assertOk();
        $this->actingAs($intern, 'api')->postJson('/api/intern/photo-dtr/punch', ['slot' => $slot, 'photo' => dtrPhoto()])->assertOk();
    }

    expect(PhotoDtr::count())->toBe(1);
});

test('punch requires a valid slot and an image', function () {
    Storage::fake('public');
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'midnight', 'photo' => dtrPhoto()])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('slot');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', [
            'slot' => 'am_in',
            'photo' => UploadedFile::fake()->create('doc.pdf', 1024, 'application/pdf'),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('photo');
});

test('pm slots cannot be clocked in the morning', function () {
    Storage::fake('public');
    $this->travelTo(Carbon::parse('2026-08-15 09:00:00'));
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'pm_in', 'photo' => dtrPhoto()])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('slot');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'pm_out', 'photo' => dtrPhoto()])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('slot');

    expect(PhotoDtr::count())->toBe(0);
});

test('am slots can be clocked in the morning and pm slots at noon', function () {
    Storage::fake('public');
    $this->travelTo(Carbon::parse('2026-08-15 09:00:00'));
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_in', 'photo' => dtrPhoto()])
        ->assertOk();
    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_out', 'photo' => dtrPhoto()])
        ->assertOk();

    $this->travelTo(Carbon::parse('2026-08-15 13:00:00'));

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'pm_in', 'photo' => dtrPhoto()])
        ->assertOk();
    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'pm_out', 'photo' => dtrPhoto()])
        ->assertOk();

    expect(PhotoDtr::count())->toBe(1);
});

test('am slots cannot be clocked in the afternoon', function () {
    Storage::fake('public');
    $this->travelTo(Carbon::parse('2026-08-15 13:00:00'));
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_in', 'photo' => dtrPhoto()])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('slot');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_out', 'photo' => dtrPhoto()])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('slot');

    expect(PhotoDtr::count())->toBe(0);
});

test('am out grace period allows clock out until before 1 PM', function () {
    Storage::fake('public');
    $this->travelTo(Carbon::parse('2026-08-15 12:30:00'));
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_out', 'photo' => dtrPhoto()])
        ->assertOk();

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'pm_in', 'photo' => dtrPhoto()])
        ->assertOk();

    expect(PhotoDtr::count())->toBe(1);
    $record = PhotoDtr::first();
    expect($record->am_out_time)->not->toBeNull();
    expect($record->pm_in_time)->not->toBeNull();
});

test('am out grace period ends at 1 PM', function () {
    Storage::fake('public');
    $this->travelTo(Carbon::parse('2026-08-15 13:00:00'));
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_out', 'photo' => dtrPhoto()])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('slot');
});

test('unapproved intern cannot punch', function () {
    Storage::fake('public');
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['status' => 'pending', 'ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_in', 'photo' => dtrPhoto()])
        ->assertForbidden();

    expect(PhotoDtr::count())->toBe(0);
});

test('undepoloyed intern cannot punch', function () {
    Storage::fake('public');
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_in', 'photo' => dtrPhoto()])
        ->assertForbidden();

    expect(PhotoDtr::count())->toBe(0);
});

test('punch photos are re-encoded to webp and capped at 1080px', function () {
    Storage::fake('public');
    $this->travelTo(Carbon::parse('2026-08-15 08:00:00'));
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/photo-dtr/punch', [
            'slot' => 'am_in',
            'photo' => UploadedFile::fake()->image('punch.jpg', 2000, 1500),
        ])
        ->assertOk();

    $record = PhotoDtr::first();
    expect($record->am_in_photo)->toEndWith('.webp');
    Storage::disk('public')->assertExists($record->am_in_photo);

    [$width, $height] = getimagesize(Storage::disk('public')->path($record->am_in_photo));
    expect($width <= 1080)->toBeTrue();
    expect($height <= 1080)->toBeTrue();
});

test('intern can filter photo dtrs by date range', function () {
    Storage::fake('public');
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->travelTo(Carbon::parse('2026-08-03 08:00:00'));
    $this->actingAs($intern, 'api')->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_in', 'photo' => dtrPhoto()])->assertOk();

    $this->travelTo(Carbon::parse('2026-08-10 08:00:00'));
    $this->actingAs($intern, 'api')->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_in', 'photo' => dtrPhoto()])->assertOk();

    $this->travelTo(Carbon::parse('2026-08-20 08:00:00'));
    $this->actingAs($intern, 'api')->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_in', 'photo' => dtrPhoto()])->assertOk();

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/photo-dtr?from=2026-08-05&to=2026-08-15')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.dtr_date', '2026-08-10');

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/photo-dtr?from=2026-08-01&to=2026-08-31')
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('intern can list their photo dtrs with today highlighted', function () {
    Storage::fake('public');
    $this->travelTo(Carbon::parse('2026-08-15 08:00:00'));
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $intern = dtrIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')->postJson('/api/intern/photo-dtr/punch', ['slot' => 'am_in', 'photo' => dtrPhoto()])->assertOk();

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/photo-dtr')
        ->assertOk()
        ->assertJsonPath('deployed', true)
        ->assertJsonPath('today.dtr_date', now()->toDateString())
        ->assertJsonCount(1, 'data')
        ->assertJsonStructure([
            'data' => [['id', 'dtr_date', 'slots', 'status', 'remarks']],
            'today',
            'deployed',
        ]);
});

test('photo dtr module is intern only', function () {
    $institute = dtrInstitute();
    $program = dtrProgram($institute);
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin, 'api')
        ->getJson('/api/intern/photo-dtr')
        ->assertForbidden();
});
