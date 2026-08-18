<?php

namespace Database\Factories;

use App\Models\AcademicTerm;
use App\Models\DailyJournal;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\Program;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DailyJournal>
 */
class DailyJournalFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'intern_id' => function (): int {
                $institute = Institute::create(['name' => 'Institute of Computing']);
                $program = Program::create(['institute_id' => $institute->id, 'name' => 'BS Computer Science']);
                $user = User::factory()->create(['role' => 'intern']);

                $intern = Intern::create([
                    'user_id' => $user->id,
                    'academic_year_id' => AcademicTerm::firstOrCreate(
                        ['code' => '2025-2026'],
                        ['description' => 'First Semester'],
                    )->id,
                    'institute_id' => $institute->id,
                    'program_id' => $program->id,
                ]);

                $intern->forceFill(['status' => 'approved'])->save();

                return $intern->id;
            },
            'date' => fake()->dateTimeBetween('-30 days', 'today')->format('Y-m-d'),
            'title' => fake()->sentence(5),
            'journal' => fake()->paragraphs(2, true),
            'status' => 'pending',
            'remarks' => null,
        ];
    }
}
