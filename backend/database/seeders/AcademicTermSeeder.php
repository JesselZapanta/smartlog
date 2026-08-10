<?php

namespace Database\Seeders;

use App\Models\AcademicTerm;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AcademicTermSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $terms = [
            [
                'code' => '231',
                'description' => '1ST SEM AY 2023-2024',
                'status' => 'inactive',
                'start_at' => '2023-08-01 00:00:00',
                'end_at' => '2023-12-31 00:00:00',
            ],
            [
                'code' => '232',
                'description' => '2ND SEM AY 2023-2024',
                'status' => 'inactive',
                'start_at' => '2024-01-01 00:00:00',
                'end_at' => '2024-05-31 00:00:00',
            ],
            [
                'code' => '233',
                'description' => 'SUMMER AY 2023-2024',
                'status' => 'inactive',
                'start_at' => '2024-05-31 00:00:00',
                'end_at' => '2024-07-31 00:00:00',
            ],
            [
                'code' => '241',
                'description' => '1ST SEM AY 2024-2025',
                'status' => 'inactive',
                'start_at' => '2024-08-01 00:00:00',
                'end_at' => '2024-12-27 00:00:00',
            ],
            [
                'code' => '242',
                'description' => '2ND SEM AY 2024-2025',
                'status' => 'inactive',
                'start_at' => '2025-01-01 00:00:00',
                'end_at' => '2025-05-31 00:00:00',
            ],
            [
                'code' => '243',
                'description' => 'SUMMER AY 2024-2025',
                'status' => 'inactive',
                'start_at' => '2025-06-01 00:00:00',
                'end_at' => '2025-07-31 00:00:00',
            ],
            [
                'code' => '251',
                'description' => '1ST SEM AY 2025-2026',
                'status' => 'inactive',
                'start_at' => '2025-08-01 00:00:00',
                'end_at' => '2025-12-31 00:00:00',
            ],
            [
                'code' => '252',
                'description' => '2ND SEM AY 2025-2026',
                'status' => 'inactive',
                'start_at' => '2026-01-01 00:00:00',
                'end_at' => '2026-05-31 00:00:00',
            ],
            [
                'code' => '253',
                'description' => 'SUMMER AY 2025-2026',
                'status' => 'inactive',
                'start_at' => '2026-06-01 00:00:00',
                'end_at' => '2026-07-31 00:00:00',
            ],
            [
                'code' => '261',
                'description' => '1ST SEM AY 2026-2027',
                'status' => 'active',
                'start_at' => '2026-08-01 00:00:00',
                'end_at' => '2026-12-31 00:00:00',
            ],
        ];

        foreach ($terms as $term) {
            AcademicTerm::updateOrCreate(['code' => $term['code']], $term);
        }
    }
}
