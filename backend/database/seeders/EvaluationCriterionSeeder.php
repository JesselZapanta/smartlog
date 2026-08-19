<?php

namespace Database\Seeders;

use App\Models\EvaluationCriterion;
use App\Models\Institute;
use Illuminate\Database\Seeder;

class EvaluationCriterionSeeder extends Seeder
{
    /**
     * Seed the standard intern evaluation criteria for every institute.
     */
    public function run(): void
    {
        $criteria = [
            'personal_characteristics' => [
                'Dresses appropriately, is neat, and well-groomed',
                'Greets with courtesy and politeness',
                'Shows punctuality in a given schedule',
                'Obeys company rules and policies',
                'Dependable and trustworthy',
                'Possess interpersonal skills in a group',
            ],
            'work_characteristics' => [
                'Demonstrates positive attitude toward work',
                'Works in an organized and systematic manner',
                'Finishes work or assignment on time',
                'Shows initiative and resourcefulness in solving job problems',
                'Works carefully with safety consciousness',
                'Completes job according to company standards',
                'Accepts extra assignment and do multi-tasking',
                'Shows courtesy in answering customer/clients concerning inquiries in any form of medium or channels',
            ],
            'job_knowledge' => [
                'Demonstrates basic technical knowledge in IT/CS tasks, including but not limited to basic computer repair and maintenance, technical support, networking, application or system development, multimedia tasks, and use of relevant software tools and technologies',
                'Analyzes technical problems and applies practical solutions',
                'Takes initiative and completes assigned tasks responsibly, showing reliability and professionalism',
                'Can quickly acquire new skills, adapt to new technologies, tools, methodologies, and apply them effectively',
                'Communicate effectively with the team for collaborative work',
            ],
        ];

        foreach (Institute::orderBy('id')->get() as $institute) {
            foreach ($criteria as $category => $indicators) {
                foreach ($indicators as $indicator) {
                    EvaluationCriterion::updateOrCreate(
                        ['institute_id' => $institute->id, 'category' => $category, 'indicator' => $indicator],
                        ['type' => 'intern', 'status' => 'active']
                    );
                }
            }
        }
    }
}
