<?php

use App\Models\AcademicTerm;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\OjtEnrollment;
use App\Models\OjtEnrollmentDocument;
use App\Models\Program;
use App\Models\Requirement;
use App\Models\RequirementSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function adminDocInstitute(): Institute
{
    return Institute::create(['name' => 'Institute of Computing']);
}

function adminDocProgram(Institute $institute): Program
{
    return Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
}

function adminDocTerm(): AcademicTerm
{
    return AcademicTerm::firstOrCreate(
        ['code' => '2025-2026'],
        ['description' => 'First Semester']
    );
}

function adminDocHte(Institute $institute, Program $program, string $name): User
{
    $user = User::factory()->create(['role' => 'hte']);
    Hte::create([
        'user_id' => $user->id,
        'name' => $name,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'status' => 'active',
    ]);

    return $user;
}

function adminDocIntern(Institute $institute, Program $program, int $hteId): User
{
    $user = User::factory()->create([
        'role' => 'intern',
        'firstname' => 'Grace',
        'middlename' => null,
        'lastname' => 'Flores',
        'extension' => null,
    ]);

    $intern = Intern::create([
        'user_id' => $user->id,
        'academic_year_id' => adminDocTerm()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'assigned_hte' => $hteId,
        'ojt_status' => 'ongoing',
    ]);

    $intern->forceFill(['status' => 'approved'])->save();

    return $user;
}

function adminDocAdmin(): User
{
    return User::factory()->create(['role' => 'admin']);
}

function adminDocRequirement(Institute $institute, string $name, string $type = 'pre_deployment'): Requirement
{
    return Requirement::create([
        'institute_id' => $institute->id,
        'name' => $name,
        'description' => null,
        'type' => $type,
        'is_active' => true,
    ]);
}

function adminDocSubmission(User $intern, Requirement $requirement, int $placementId, string $status = 'approved'): RequirementSubmission
{
    return RequirementSubmission::create([
        'user_id' => $intern->id,
        'intern_id' => $intern->intern->id,
        'placement_id' => $placementId,
        'requirement_id' => $requirement->id,
        'file_path' => UploadedFile::fake()->create('submission.pdf', 32, 'application/pdf')->store('requirement-submissions', 'public'),
        'status' => $status,
    ]);
}

function adminDocEnrollment(User $user, Institute $institute, Program $program, string $status = 'approved'): OjtEnrollment
{
    return OjtEnrollment::create([
        'user_id' => $user->id,
        'academic_year_id' => adminDocTerm()->id,
        'institute_id' => $institute->id,
        'program_id' => $program->id,
        'ojt_hours' => 486,
        'status' => $status,
    ]);
}

function adminDocEnrollmentDocument(OjtEnrollment $enrollment, string $type): OjtEnrollmentDocument
{
    return OjtEnrollmentDocument::create([
        'ojt_enrollment_id' => $enrollment->id,
        'label' => match ($type) {
            'cor' => 'New COR',
            'curriculum' => 'Curriculum',
            default => ucfirst($type),
        },
        'type' => $type,
        'file_path' => UploadedFile::fake()->create($type.'.pdf', 32, 'application/pdf')->store('ojt-enrollment-documents', 'public'),
    ]);
}

test('admin requirement list keeps every placement of a transferred intern with host context', function () {
    Storage::fake('public');

    $institute = adminDocInstitute();
    $program = adminDocProgram($institute);
    $firstHost = adminDocHte($institute, $program, 'Vinz Itech');
    $secondHost = adminDocHte($institute, $program, 'CICTO');
    $intern = adminDocIntern($institute, $program, $firstHost->hte->id);
    $requirement = adminDocRequirement($institute, 'Certificate of Registration');

    $firstPlacement = $intern->intern->activePlacement();
    adminDocSubmission($intern, $requirement, $firstPlacement->id);

    // Transfer to the second host, then submit the same requirement there too.
    $intern->intern->forceFill(['assigned_hte' => $secondHost->hte->id])->save();
    $intern = $intern->fresh();
    $secondPlacement = $intern->intern->activePlacement();
    adminDocSubmission($intern, $requirement, $secondPlacement->id);

    $pending = adminDocRequirement($institute, 'MOA');
    adminDocSubmission($intern, $pending, $secondPlacement->id, 'pending');

    $this->actingAs(adminDocAdmin(), 'api')
        ->getJson('/api/documents')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('data.0.placement.hte', 'CICTO')
        ->assertJsonPath('data.0.placement.is_current', true)
        ->assertJsonPath('data.1.placement.hte', 'Vinz Itech')
        ->assertJsonPath('data.1.placement.is_current', false)
        ->assertJsonPath('data.0.intern.full_name', 'Grace Flores');
});

test('admin requirement list filters by institute, year, requirement and search', function () {
    Storage::fake('public');

    $institute = adminDocInstitute();
    $program = adminDocProgram($institute);
    $host = adminDocHte($institute, $program, 'Vinz Itech');
    $intern = adminDocIntern($institute, $program, $host->hte->id);
    $requirement = adminDocRequirement($institute, 'Certificate of Registration');
    $other = adminDocRequirement($institute, 'MOA');

    $placement = $intern->intern->activePlacement();
    adminDocSubmission($intern, $requirement, $placement->id);
    adminDocSubmission($intern, $other, $placement->id);

    $admin = adminDocAdmin();

    $this->actingAs($admin, 'api')
        ->getJson("/api/documents?institute_id={$institute->id}&academic_year_id=".adminDocTerm()->id)
        ->assertOk()
        ->assertJsonPath('meta.total', 2);

    $this->actingAs($admin, 'api')
        ->getJson("/api/documents?requirement_ids={$requirement->id}")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.requirement.name', 'Certificate of Registration');

    $this->actingAs($admin, 'api')
        ->getJson('/api/documents?search=flores')
        ->assertOk()
        ->assertJsonPath('meta.total', 2);

    $this->actingAs($admin, 'api')
        ->getJson('/api/documents?search=torres')
        ->assertOk()
        ->assertJsonPath('meta.total', 0);
});

test('admin requirement download bundles matching files into a zip', function () {
    Storage::fake('public');

    $institute = adminDocInstitute();
    $program = adminDocProgram($institute);
    $host = adminDocHte($institute, $program, 'Vinz Itech');
    $intern = adminDocIntern($institute, $program, $host->hte->id);
    $requirement = adminDocRequirement($institute, 'Certificate of Registration');

    adminDocSubmission($intern, $requirement, $intern->intern->activePlacement()->id);

    $response = $this->actingAs(adminDocAdmin(), 'api')
        ->get('/api/documents/download');

    $response->assertOk();

    $zip = new ZipArchive;
    expect($zip->open($response->getFile()->getPathname()))->toBeTrue();

    $expected = 'first_semester/institute_of_computing/certificate_of_registration/certificate_of_registration_grace_flores.pdf';

    expect($zip->numFiles)->toBe(1)
        ->and($zip->locateName($expected))->not->toBeFalse();

    $zip->close();
});

test('admin requirement download returns 422 when only unapproved files match', function () {
    Storage::fake('public');

    $institute = adminDocInstitute();
    $program = adminDocProgram($institute);
    $host = adminDocHte($institute, $program, 'Vinz Itech');
    $intern = adminDocIntern($institute, $program, $host->hte->id);
    $requirement = adminDocRequirement($institute, 'MOA');

    adminDocSubmission($intern, $requirement, $intern->intern->activePlacement()->id, 'pending');

    $this->actingAs(adminDocAdmin(), 'api')
        ->getJson('/api/documents/download')
        ->assertStatus(422)
        ->assertJsonPath('errors.documents.0', 'No files to download. Adjust your filters and try again.');
});

test('admin enrollment list returns cor and curriculum of approved applications only', function () {
    Storage::fake('public');

    $institute = adminDocInstitute();
    $program = adminDocProgram($institute);

    $approved = adminDocEnrollment(User::factory()->create(['role' => 'intern', 'firstname' => 'Grace', 'lastname' => 'Flores', 'middlename' => null, 'extension' => null]), $institute, $program);
    adminDocEnrollmentDocument($approved, 'cor');
    adminDocEnrollmentDocument($approved, 'curriculum');

    $pending = adminDocEnrollment(User::factory()->create(['role' => 'intern', 'firstname' => 'Paolo', 'lastname' => 'Torres', 'middlename' => null, 'extension' => null]), $institute, $program, 'pending');
    adminDocEnrollmentDocument($pending, 'cor');

    $admin = adminDocAdmin();

    $this->actingAs($admin, 'api')
        ->getJson('/api/documents?source=enrollment')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('data.0.document_type', 'curriculum')
        ->assertJsonPath('data.1.document_type', 'cor')
        ->assertJsonPath('data.0.intern.full_name', 'Grace Flores')
        ->assertJsonPath('data.0.intern.academic_year', 'First Semester');

    $this->actingAs($admin, 'api')
        ->getJson("/api/documents?source=enrollment&institute_id={$institute->id}&academic_year_id=".adminDocTerm()->id)
        ->assertOk()
        ->assertJsonPath('meta.total', 2);

    $this->actingAs($admin, 'api')
        ->getJson('/api/documents?source=enrollment&search=torres')
        ->assertOk()
        ->assertJsonPath('meta.total', 0);
});

test('admin enrollment download bundles cor and curriculum into a zip', function () {
    Storage::fake('public');

    $institute = adminDocInstitute();
    $program = adminDocProgram($institute);

    $approved = adminDocEnrollment(User::factory()->create(['role' => 'intern', 'firstname' => 'Grace', 'lastname' => 'Flores', 'middlename' => null, 'extension' => null]), $institute, $program);
    adminDocEnrollmentDocument($approved, 'cor');
    adminDocEnrollmentDocument($approved, 'curriculum');

    $response = $this->actingAs(adminDocAdmin(), 'api')
        ->get('/api/documents/download?source=enrollment');

    $response->assertOk();

    $zip = new ZipArchive;
    expect($zip->open($response->getFile()->getPathname()))->toBeTrue();

    $folder = 'first_semester/institute_of_computing/enrollment_documents';

    expect($zip->numFiles)->toBe(2)
        ->and($zip->locateName($folder.'/new_cor_grace_flores.pdf'))->not->toBeFalse()
        ->and($zip->locateName($folder.'/curriculum_grace_flores.pdf'))->not->toBeFalse();

    $zip->close();
});

test('admin enrollment download returns 422 when nothing matches', function () {
    $this->actingAs(adminDocAdmin(), 'api')
        ->getJson('/api/documents/download?source=enrollment')
        ->assertStatus(422)
        ->assertJsonPath('errors.documents.0', 'No files to download. Adjust your filters and try again.');
});
