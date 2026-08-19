<?php

namespace Database\Seeders;

use App\Models\EvaluationCriterion;
use App\Models\Institute;
use Illuminate\Database\Seeder;

class EvaluationHteCriterionSeeder extends Seeder
{
    /**
     * Seed the standard HTE evaluation criteria (intern evaluates the HTE)
     * for every institute.
     */
    public function run(): void
    {
        $criteria = [
            'personal_characteristics' => [
                'HTE personnel are courteous, respectful, and professional toward interns',
                'HTE personnel are approachable and easy to communicate with',
                'HTE personnel show patience in guiding interns',
                'HTE personnel demonstrate integrity and fairness in dealing with interns',
                'HTE personnel are accommodating and supportive of interns\' needs',
                'The HTE maintains a welcoming and friendly work atmosphere',
            ],
            'work_characteristics' => [
                'Provides clear orientation on company rules, policies, and safety',
                'Assigns meaningful tasks that match the intern\'s course and OJT objectives',
                'Provides adequate supervision and guidance',
                'Gives timely and constructive feedback on intern performance',
                'Monitors intern progress and offers assistance when needed',
                'Maintains an organized and systematic training program',
                'Provides a safe, clean, and conducive working environment',
                'Values interns\' inputs and encourages participation',
            ],
            'job_knowledge' => [
                'Demonstrates competence and expertise in the assigned work processes',
                'Effectively explains tasks and procedures to interns',
                'Provides practical guidance relevant to the intern\'s field of study',
                'Helps interns apply academic knowledge to actual workplace tasks',
                'Provides opportunities for interns to learn new skills and technologies',
            ],
        ];

        foreach (Institute::orderBy('id')->get() as $institute) {
            foreach ($criteria as $category => $indicators) {
                foreach ($indicators as $indicator) {
                    EvaluationCriterion::updateOrCreate(
                        ['institute_id' => $institute->id, 'category' => $category, 'indicator' => $indicator],
                        ['type' => 'hte', 'status' => 'active']
                    );
                }
            }
        }
    }
}
