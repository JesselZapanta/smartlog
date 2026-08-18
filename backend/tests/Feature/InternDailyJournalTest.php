<?php

use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\JournalPhoto;
use App\Models\PhotoDtr;
use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function journalInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function journalProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function journalIntern(Institute $institute, Program $program, array $attributes = []): User
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

function journalPhoto(): UploadedFile
{
    return UploadedFile::fake()->image('journal.jpg', 800, 600);
}

function journalPayload(string $date, array $overrides = []): array
{
    return [
        'date' => $date,
        'title' => 'Day at the office',
        'journal' => 'Assisted with the inventory system and shadowed the IT staff.',
        ...$overrides,
    ];
}

function journalDtr(User $user, string $date): PhotoDtr
{
    return PhotoDtr::create([
        'intern_id' => $user->intern->id,
        'dtr_date' => $date,
        'status' => 'pending',
    ]);
}

function journalDeploy(User $user): void
{
    Intern::where('user_id', $user->id)->update(['ojt_status' => 'ongoing']);
}

test('intern can create a journal entry with photos', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);
    journalDtr($intern, '2026-08-15');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-15', [
            'photos' => [journalPhoto(), journalPhoto()],
        ]))
        ->assertCreated()
        ->assertJsonPath('data.date', '2026-08-15')
        ->assertJsonPath('data.title', 'Day at the office')
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonCount(2, 'data.photos');

    $journal = DailyJournal::first();
    expect($journal)->not->toBeNull();
    expect($journal->intern_id)->toBe(Intern::where('user_id', $intern->id)->first()->id);
    expect(JournalPhoto::count())->toBe(2);

    foreach (JournalPhoto::all() as $photo) {
        expect($photo->photo)->toEndWith('.webp');
        Storage::disk('public')->assertExists($photo->photo);
    }
});

test('intern cannot create two journals for the same day', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);
    journalDtr($intern, '2026-08-15');

    $this->actingAs($intern, 'api')->postJson('/api/intern/journals', journalPayload('2026-08-15'))->assertCreated();
    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-15'))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('date');

    expect(DailyJournal::count())->toBe(1);
});

test('journal date cannot be in the future', function () {
    Storage::fake('public');
    $this->travelTo('2026-08-15');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-20'))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('date');
});

test('journal date requires a photo DTR record', function () {
    Storage::fake('public');
    $this->travelTo('2026-08-15');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update([
        'ojt_status' => 'ongoing',
        'start_date' => '2026-08-10',
    ]);

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/journals?month=2026-08')
        ->assertOk()
        ->assertJsonPath('start_date', '2026-08-10');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-12'))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('date');

    expect(DailyJournal::count())->toBe(0);

    journalDtr($intern, '2026-08-12');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-12'))
        ->assertCreated();

    expect(DailyJournal::count())->toBe(1);
});

test('journal photos must be valid images', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);
    journalDtr($intern, '2026-08-15');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-15', [
            'photos' => [UploadedFile::fake()->create('doc.pdf', 1024, 'application/pdf')],
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('photos.0');

    expect(DailyJournal::count())->toBe(0);
});

test('intern can list journal entries filtered by month', function () {
    Storage::fake('public');
    $this->travelTo('2026-09-10');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);

    foreach (['2026-08-03', '2026-08-10', '2026-09-02'] as $date) {
        journalDtr($intern, $date);
        $this->actingAs($intern, 'api')->postJson('/api/intern/journals', journalPayload($date))->assertCreated();
    }

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/journals?month=2026-08')
        ->assertOk()
        ->assertJsonPath('deployed', true)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.date', '2026-08-10');
});

test('intern can look up the journal for a specific date', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);
    journalDtr($intern, '2026-08-15');

    $this->actingAs($intern, 'api')->postJson('/api/intern/journals', journalPayload('2026-08-15'))->assertCreated();

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/journals?date=2026-08-15')
        ->assertOk()
        ->assertJsonPath('data.date', '2026-08-15');

    $this->actingAs($intern, 'api')
        ->getJson('/api/intern/journals?date=2026-08-16')
        ->assertOk()
        ->assertJsonPath('data', null);
});

test('intern can view one of their journal entries with photos', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);
    journalDtr($intern, '2026-08-15');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-15', ['photos' => [journalPhoto()]]))
        ->assertCreated();

    $journal = DailyJournal::first();

    $this->actingAs($intern, 'api')
        ->getJson("/api/intern/journals/{$journal->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $journal->id)
        ->assertJsonCount(1, 'data.photos');
});

test('intern can update a journal, add and remove photos, and status resets to pending', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);
    journalDtr($intern, '2026-08-15');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-15', ['photos' => [journalPhoto(), journalPhoto()]]))
        ->assertCreated();

    $journal = DailyJournal::first();
    $keep = JournalPhoto::first();
    $remove = JournalPhoto::where('id', '!=', $keep->id)->first();

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/journals/{$journal->id}", [
            'title' => 'Updated title',
            'journal' => 'Updated content for the day.',
            'remove_photos' => [$remove->id],
            'photos' => [journalPhoto()],
        ])
        ->assertOk()
        ->assertJsonPath('data.title', 'Updated title')
        ->assertJsonPath('data.journal', 'Updated content for the day.')
        ->assertJsonCount(2, 'data.photos');

    expect($journal->fresh()->status)->toBe('pending');
    Storage::disk('public')->assertMissing($remove->photo);
});

test('journal update enforces a maximum of six photos', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);
    journalDtr($intern, '2026-08-15');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-15'))
        ->assertCreated();

    $journal = DailyJournal::first();

    $this->actingAs($intern, 'api')
        ->postJson("/api/intern/journals/{$journal->id}", [
            'title' => 'T',
            'journal' => 'J',
            'photos' => array_fill(0, 7, journalPhoto()),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('photos');
});

test('intern can delete a journal and its photos are removed from storage', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);
    journalDtr($intern, '2026-08-15');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-15', ['photos' => [journalPhoto()]]))
        ->assertCreated();

    $journal = DailyJournal::first();
    $photoPath = $journal->photos->first()->photo;

    $this->actingAs($intern, 'api')
        ->deleteJson("/api/intern/journals/{$journal->id}")
        ->assertOk()
        ->assertJsonPath('data.message', 'Journal deleted successfully.');

    expect(DailyJournal::count())->toBe(0);
    expect(JournalPhoto::count())->toBe(0);
    Storage::disk('public')->assertMissing($photoPath);
});

test('intern cannot manage another interns journal', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $owner = journalIntern($institute, $program);
    $other = journalIntern($institute, $program);
    Intern::where('user_id', $owner->id)->update(['ojt_status' => 'ongoing']);
    journalDtr($owner, '2026-08-15');

    $this->actingAs($owner, 'api')->postJson('/api/intern/journals', journalPayload('2026-08-15'))->assertCreated();
    $journal = DailyJournal::first();

    $this->actingAs($other, 'api')->getJson("/api/intern/journals/{$journal->id}")->assertForbidden();
    $this->actingAs($other, 'api')
        ->postJson("/api/intern/journals/{$journal->id}", ['title' => 'T', 'journal' => 'J'])
        ->assertForbidden();
    $this->actingAs($other, 'api')->deleteJson("/api/intern/journals/{$journal->id}")->assertForbidden();
});

test('unapproved intern cannot create a journal', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['status' => 'pending', 'ojt_status' => 'ongoing']);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-15'))
        ->assertForbidden();

    expect(DailyJournal::count())->toBe(0);
});

test('undeployed intern cannot create a journal', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-15'))
        ->assertForbidden();

    expect(DailyJournal::count())->toBe(0);
});

test('journal module is intern only', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin, 'api')
        ->getJson('/api/intern/journals')
        ->assertForbidden();
});

test('journal photos are re-encoded to webp and capped at 1080px', function () {
    Storage::fake('public');
    $institute = journalInstitute();
    $program = journalProgram($institute);
    $intern = journalIntern($institute, $program);
    Intern::where('user_id', $intern->id)->update(['ojt_status' => 'ongoing']);
    journalDtr($intern, '2026-08-15');

    $this->actingAs($intern, 'api')
        ->postJson('/api/intern/journals', journalPayload('2026-08-15', [
            'photos' => [UploadedFile::fake()->image('journal.jpg', 2000, 1500)],
        ]))
        ->assertCreated();

    $photo = JournalPhoto::first();
    expect($photo->photo)->toEndWith('.webp');
    Storage::disk('public')->assertExists($photo->photo);

    [$width, $height] = getimagesize(Storage::disk('public')->path($photo->photo));
    expect($width <= 1080)->toBeTrue();
    expect($height <= 1080)->toBeTrue();
});
