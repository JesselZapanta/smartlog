<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    /**
     * Seed the application's users.
     */
    public function run(): void
    {
        $users = [
            [
                'firstname' => 'Juan',
                'middlename' => 'Santos',
                'lastname' => 'Dela Cruz',
                'role' => 'admin',
                'email' => 'admin@smartlog.test',
            ],
            [
                'firstname' => 'Maria',
                'middlename' => 'Lopez',
                'lastname' => 'Garcia',
                'role' => 'intern',
                'email' => 'intern@smartlog.test',
            ],
            [
                'firstname' => 'Carmen',
                'middlename' => 'Reyes',
                'lastname' => 'Tan',
                'role' => 'ojt_instructor',
                'email' => 'instructor@smartlog.test',
            ],
            [
                'firstname' => 'Ramon',
                'middlename' => 'Aquino',
                'lastname' => 'Mendoza',
                'role' => 'ojt_coordinator',
                'email' => 'coordinator@smartlog.test',
            ],
            [
                'firstname' => 'Liza',
                'middlename' => 'Villar',
                'lastname' => 'Cruz',
                'role' => 'hte',
                'email' => 'hte@smartlog.test',
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'uuid' => (string) Str::uuid(),
                    'firstname' => $user['firstname'],
                    'middlename' => $user['middlename'],
                    'lastname' => $user['lastname'],
                    'extension' => null,
                    'contact_number' => null,
                    'profile_picture' => null,
                    'role' => $user['role'],
                    'email_verified_at' => now(),
                    'password' => 'password',
                ]
            );
        }
    }
}
