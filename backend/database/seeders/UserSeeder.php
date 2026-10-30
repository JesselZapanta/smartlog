<?php

namespace Database\Seeders;

use App\Models\AcademicTerm;
use App\Models\Coordinator;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Location;
use App\Models\User;
use Database\Seeders\Concerns\ResolvesDemoAccounts;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    use ResolvesDemoAccounts;

    private const PASSWORD = 'password';

    private const BARANGAYS = [
        'Mantic', 'Santa Isabel', 'Baliwagan', 'Mauswagon', 'Labuyo',
        'Sicot', 'Huyohoy', 'Silanga', 'Matugnao', 'Pangabuan',
    ];

    private const FAMILY = [
        ['fathers_name' => 'Pedro Dela Cruz', 'fathers_occupation' => 'Farmer', 'mothers_name' => 'Juana Dela Cruz', 'mothers_occupation' => 'Teacher'],
        ['fathers_name' => 'Ramon Santos', 'fathers_occupation' => 'Fisherman', 'mothers_name' => 'Elena Santos', 'mothers_occupation' => 'Housewife'],
        ['fathers_name' => 'Jose Reyes', 'fathers_occupation' => 'Driver', 'mothers_name' => 'Carmen Reyes', 'mothers_occupation' => 'Vendor'],
        ['fathers_name' => 'Carlos Garcia', 'fathers_occupation' => 'Carpenter', 'mothers_name' => 'Ana Garcia', 'mothers_occupation' => 'Seamstress'],
        ['fathers_name' => 'Miguel Mendoza', 'fathers_occupation' => 'Farmer', 'mothers_name' => 'Luz Mendoza', 'mothers_occupation' => 'Teacher'],
        ['fathers_name' => 'Andres Aquino', 'fathers_occupation' => 'Barangay Kagawad', 'mothers_name' => 'Rosa Aquino', 'mothers_occupation' => 'Housewife'],
        ['fathers_name' => 'Paolo Villanueva', 'fathers_occupation' => 'Electrician', 'mothers_name' => 'Liza Villanueva', 'mothers_occupation' => 'Vendor'],
        ['fathers_name' => 'Rafael Ramos', 'fathers_occupation' => 'Fisherman', 'mothers_name' => 'Nina Ramos', 'mothers_occupation' => 'Teacher'],
        ['fathers_name' => 'Marco Torres', 'fathers_occupation' => 'Driver', 'mothers_name' => 'Sofia Torres', 'mothers_occupation' => 'Housewife'],
        ['fathers_name' => 'Juan Flores', 'fathers_occupation' => 'Farmer', 'mothers_name' => 'Grace Flores', 'mothers_occupation' => 'Barangay Health Worker'],
    ];

    private const FIRST_NAMES_MALE = ['Juan', 'Pedro', 'Jose', 'Carlos', 'Marco', 'Rafael', 'Miguel', 'Andres', 'Paolo', 'Ramon'];

    private const FIRST_NAMES_FEMALE = ['Maria', 'Juana', 'Ana', 'Elena', 'Rosa', 'Liza', 'Carla', 'Sofia', 'Nina', 'Grace'];

    private const LAST_NAMES = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Aquino', 'Villanueva', 'Ramos', 'Torres', 'Flores'];

    /**
     * Partner establishments per institute; #1 and #2 anchor the transfer
     * showcase, the rest widen the pool a coordinator can deploy interns to.
     */
    private const HTE_NAMES = [
        'Institute of Teacher Education (ITE)' => [
            'Tangub City Central Elementary School',
            'Tangub City National High School',
            'Mantic Elementary School',
            'Silanga National High School',
            'Santa Isabel Elementary School',
        ],
        'Institute of Business and Financial Services (IBFS)' => [
            'Tangub City Hall - Human Resource Office',
            'Tangub City Cooperative Office',
            "Tangub City Treasurer's Office",
            "Tangub City Assessor's Office",
            'Land Bank of the Philippines - Tangub Branch',
        ],
        'Institute of Computer Studies (ICS)' => [
            'City Information and Communications Technology Office',
            'Vinz Itech Solutions',
            'iFix Computer Solutions',
            'TechHub Computer Trading',
            'NorthMind IT Solutions',
        ],
        'Institute of Criminal Justice Education (ICJE)' => [
            'Tangub City Police Station',
            'BJMP Tangub City Jail',
            'Tangub City Fire Station',
            'Municipal Trial Court in Cities - Tangub City',
            'Tangub City Traffic Management Office',
        ],
        'Institute of Health Sciences (IHS)' => [
            'Tangub City Health Office',
            'Tangub City Birthing Home',
            'Doña Maria D. Tan Memorial Hospital',
            'Tangub City Nutrition Office',
            'Mantic Barangay Health Station',
        ],
        'Institute of Arts and Sciences (IAS)' => [
            'TGCC Community Extension Office',
            'Tangub City Tourism Office',
            'Tangub City Public Information Office',
            'Tangub City Social Welfare and Development Office',
            'Tangub City Public Library',
        ],
    ];

    /**
     * @var array<int, array{0: string, 1: string, 2: string}>
     */
    private const HTE_PEOPLE = [
        ['Ramon', 'Aquino', 'Mendoza'],
        ['Andres', 'Ramos', 'Villanueva'],
        ['Ernesto', 'Diaz', 'Salazar'],
        ['Lorna', 'Santos', 'Padilla'],
        ['Editha', 'Gomez', 'Bautista'],
    ];

    /**
     * Seed users for every role:
     * 1 admin, then per institute: 1 coordinator, 1 instructor, 5 HTEs, and
     * 10 interns — the first four approved as the base the placement showcase
     * builds on, the rest still awaiting registration review.
     */
    public function run(): void
    {
        $this->seedAdmin();

        foreach (Institute::orderBy('id')->get() as $institute) {
            $programId = $institute->programs()->orderBy('id')->value('id');

            if ($programId === null) {
                continue;
            }

            $this->seedCoordinator($institute, $programId);
            $this->seedInstructor($institute, $programId);
            $this->seedHtes($institute, $programId);

            for ($i = 1; $i <= 10; $i++) {
                $this->seedIntern($institute, $programId, $i);
            }
        }
    }

    private function seedAdmin(): void
    {
        $this->createUser(
            email: 'admin@smartlog.test',
            role: 'admin',
            firstname: 'Juan',
            middlename: 'Santos',
            lastname: 'Dela Cruz',
            contactNumber: '09171234567',
            location: ['Mantic', 'Misamis Occidental', 'Tangub City'],
        );
    }

    private function seedCoordinator(Institute $institute, int $programId): void
    {
        $user = $this->createUser(
            email: $this->coordinatorEmail($institute),
            role: 'ojt_coordinator',
            firstname: 'Maria',
            middlename: 'Lopez',
            lastname: 'Garcia',
            contactNumber: '09171234568',
            location: ['Mantic', 'Misamis Occidental', 'Tangub City'],
        );

        Coordinator::updateOrCreate(
            ['user_id' => $user->id],
            ['institute_id' => $institute->id, 'program_id' => $programId]
        );
    }

    private function seedInstructor(Institute $institute, int $programId): void
    {
        $user = $this->createUser(
            email: $this->instructorEmail($institute),
            role: 'ojt_instructor',
            firstname: 'Carmen',
            middlename: 'Reyes',
            lastname: 'Tan',
            contactNumber: '09171234569',
            location: ['Mantic', 'Misamis Occidental', 'Tangub City'],
        );

        Coordinator::updateOrCreate(
            ['user_id' => $user->id],
            ['institute_id' => $institute->id, 'program_id' => $programId]
        );
    }

    private function seedHtes(Institute $institute, int $programId): void
    {
        $names = self::HTE_NAMES[$institute->name] ?? [];

        foreach (self::HTE_PEOPLE as $position => [$firstname, $middlename, $lastname]) {
            $index = $position + 1;

            $this->seedHteAccount(
                $institute,
                $programId,
                $index,
                $names[$position] ?? "{$institute->name} Partner Establishment {$index}",
                $firstname,
                $middlename,
                $lastname,
                '091712345'.(69 + $index),
            );
        }
    }

    private function seedHteAccount(
        Institute $institute,
        int $programId,
        int $index,
        string $name,
        string $firstname,
        string $middlename,
        string $lastname,
        string $contactNumber,
    ): void {
        $user = $this->createUser(
            email: $this->hteEmail($institute, $index),
            role: 'hte',
            firstname: $firstname,
            middlename: $middlename,
            lastname: $lastname,
            contactNumber: $contactNumber,
            location: ['Mantic', 'Misamis Occidental', 'Tangub City'],
        );

        Hte::updateOrCreate(
            ['user_id' => $user->id],
            [
                'name' => $name,
                'institute_id' => $institute->id,
                'program_id' => $programId,
                'moa' => null,
                'start_at' => '2026-08-01 00:00:00',
                'end_at' => '2026-12-31 00:00:00',
                'status' => 'active',
            ]
        );
    }

    private function seedIntern(Institute $institute, int $programId, int $index): void
    {
        $family = self::FAMILY[($index - 1) % count(self::FAMILY)];
        $female = $index % 2 === 0;
        $firstNames = $female ? self::FIRST_NAMES_FEMALE : self::FIRST_NAMES_MALE;
        $approved = $index <= 4;

        $user = $this->createUser(
            email: $this->internEmail($institute, $index),
            role: 'intern',
            firstname: $firstNames[($index - 1) % count($firstNames)],
            middlename: null,
            lastname: self::LAST_NAMES[($index - 1) % count(self::LAST_NAMES)],
            contactNumber: '0917'.str_pad((string) (1000000 + $index * 13), 7, '0', STR_PAD_LEFT),
            location: [self::BARANGAYS[($index - 1) % count(self::BARANGAYS)], 'Misamis Occidental', 'Tangub City'],
        );

        $academicYearId = AcademicTerm::where('status', 'active')->latest('start_at')->value('id')
            ?? AcademicTerm::latest('start_at')->value('id');

        $reviewerId = Coordinator::where('institute_id', $institute->id)
            ->whereHas('user', fn ($query) => $query->where('role', 'ojt_coordinator'))
            ->value('user_id');

        Intern::updateOrCreate(
            ['user_id' => $user->id],
            [
                'academic_year_id' => $academicYearId,
                'institute_id' => $institute->id,
                'program_id' => $programId,
                'date_of_birth' => now()->subYears(20 + ($index % 3))->subDays($index * 7)->format('Y-m-d'),
                'place_of_birth' => 'Tangub City, Misamis Occidental',
                ...$family,
                'fathers_contact' => '0917'.str_pad((string) (2000000 + $index * 11), 7, '0', STR_PAD_LEFT),
                'mothers_contact' => '0917'.str_pad((string) (3000000 + $index * 11), 7, '0', STR_PAD_LEFT),
                'parents_guardian_address' => 'Brgy. '.self::BARANGAYS[($index - 1) % count(self::BARANGAYS)].', Tangub City',
                'practicum_instructor' => 'Prof. '.self::LAST_NAMES[$index % count(self::LAST_NAMES)],
                'status' => $approved ? 'approved' : 'pending',
                'rejection_reason' => null,
                'reviewed_by' => $approved ? $reviewerId : null,
                'reviewed_at' => $approved ? now() : null,
            ]
        );
    }

    /**
     * @param  array{0: string, 1: string, 2: string}  $location
     */
    private function createUser(
        string $email,
        string $role,
        string $firstname,
        ?string $middlename,
        string $lastname,
        string $contactNumber,
        array $location,
    ): User {
        $user = User::firstOrNew(['email' => $email]);

        $user->uuid ??= (string) Str::uuid();

        $user->fill([
            'firstname' => $firstname,
            'middlename' => $middlename,
            'lastname' => $lastname,
            'extension' => null,
            'contact_number' => $contactNumber,
            'profile_picture' => null,
            'role' => $role,
            'email_verified_at' => now(),
            'password' => self::PASSWORD,
        ])->save();

        Location::updateOrCreate(
            ['user_id' => $user->id],
            [
                'region' => '10',
                'province' => $location[1],
                'city_municipality' => $location[2],
                'barangay' => $location[0],
                'status' => 'active',
            ]
        );

        return $user;
    }
}
