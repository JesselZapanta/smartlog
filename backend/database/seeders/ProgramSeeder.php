<?php

namespace Database\Seeders;

use App\Models\Institute;
use App\Models\Program;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProgramSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $programs = [
            'Institute of Teacher Education (ITE)' => [
                'Bachelor of Elementary Education (BEED)',
                'Bachelor of Secondary Education (BSEd) Major in Mathematics',
                'Bachelor of Secondary Education (BSEd) Major in English',
                'Bachelor of Secondary Education (BSEd) Major in Filipino',
                'Bachelor of Secondary Education (BSEd) Major in Social Studies',
            ],
            'Institute of Business and Financial Services (IBFS)' => [
                'Bachelor of Science in Business Administration Major in Human Resource Management (BSBA-HRM)',
                'Bachelor of Science in Business Administration Major in Marketing Management (BSBA-MM)',
                'Bachelor of Science in Office Administration (BSOA)',
            ],
            'Institute of Computer Studies (ICS)' => [
                'Bachelor of Science in Computer Science (BSCS)',
            ],
            'Institute of Criminal Justice Education (ICJE)' => [
                'Bachelor of Science in Criminology (BSCrim)',
                'Bachelor of Science in Industrial Security Management (BSISM)',
            ],
            'Institute of Health Sciences (IHS)' => [
                'General Midwifery',
            ],
            'Institute of Arts and Sciences (IAS)' => [
                'Bachelor of Arts in Political Science',
                'Bachelor of Arts in English',
                'Bachelor of Arts in Communication',
            ],
        ];

        foreach ($programs as $instituteName => $programNames) {
            $institute = Institute::where('name', $instituteName)->first();

            if ($institute === null) {
                continue;
            }

            foreach ($programNames as $programName) {
                Program::updateOrCreate(
                    ['institute_id' => $institute->id, 'name' => $programName],
                    ['is_active' => true]
                );
            }
        }
    }
}
