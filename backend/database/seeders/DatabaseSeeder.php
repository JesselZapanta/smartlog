<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            AcademicTermSeeder::class,
            InstituteSeeder::class,
            ProgramSeeder::class,
            RequirementSeeder::class,
            OjtHourSeeder::class,
            EvaluationCriterionSeeder::class,
            EvaluationHteCriterionSeeder::class,
            UserSeeder::class,
        ]);
    }
}
