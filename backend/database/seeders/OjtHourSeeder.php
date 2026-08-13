<?php

namespace Database\Seeders;

use App\Models\Institute;
use App\Models\OjtHour;
use Illuminate\Database\Seeder;

class OjtHourSeeder extends Seeder
{
    /**
     * Required OJT hours per institute.
     */
    private const HOURS_BY_INSTITUTE = [
        'Institute of Teacher Education (ITE)' => 400,
        'Institute of Business and Financial Services (IBFS)' => 600,
        'Institute of Computer Studies (ICS)' => 500,
        'Institute of Criminal Justice Education (ICJE)' => 250,
        'Institute of Health Sciences (IHS)' => 500,
        'Institute of Arts and Sciences (IAS)' => 400,
    ];

    /**
     * Seed the required OJT hours for each institute.
     */
    public function run(): void
    {
        foreach (Institute::orderBy('id')->get() as $institute) {
            $hours = self::HOURS_BY_INSTITUTE[$institute->name] ?? 486;

            OjtHour::updateOrCreate(
                ['institute_id' => $institute->id],
                ['hours' => $hours]
            );
        }
    }
}
