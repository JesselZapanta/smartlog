<?php

namespace Database\Factories;

use App\Models\DailyJournal;
use App\Models\JournalPhoto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JournalPhoto>
 */
class JournalPhotoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'journal_id' => DailyJournal::factory(),
            'photo' => 'journal-photos/'.fake()->uuid().'.webp',
        ];
    }
}
