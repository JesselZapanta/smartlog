<?php

namespace Database\Seeders;

use App\Models\Institute;
use App\Models\Requirement;
use Illuminate\Database\Seeder;

class RequirementSeeder extends Seeder
{
    /**
     * Seed OJT requirements — OPAO office requirements plus institute-specific ones.
     */
    public function run(): void
    {
        // ── Common Office Requirements (all 10, for every institute) ──
        $commonRequirements = [
            ['name' => 'Certificate of Registration', 'description' => 'Official certificate of registration from the institute', 'type' => 'pre_deployment'],
            ['name' => "Intern's Profile", 'description' => 'Complete profile of the intern including personal and academic information', 'type' => 'pre_deployment'],
            ['name' => "Notarized Parents' Consent", 'description' => 'Notarized consent form from parents or guardian for the internship', 'type' => 'pre_deployment'],
            ['name' => 'Agreement & Liability Waiver', 'description' => 'Signed agreement and liability waiver form', 'type' => 'pre_deployment'],
            ['name' => 'Medical Clearance', 'description' => 'Medical clearance certificate from a licensed physician', 'type' => 'pre_deployment'],
            ['name' => 'Medical Insurance', 'description' => 'Proof of medical insurance coverage during the internship period', 'type' => 'pre_deployment'],
            ['name' => 'Endorsement Letter', 'description' => 'Official endorsement letter from the institute to the host company', 'type' => 'pre_deployment'],
            ['name' => 'MOA', 'description' => 'Memorandum of Agreement between the institute and the host company', 'type' => 'pre_deployment'],
            ['name' => 'Internship Contract', 'description' => 'Signed internship contract between intern, institute, and host company', 'type' => 'pre_deployment'],
            ['name' => 'Internship Plan', 'description' => 'Detailed internship plan outlining objectives, tasks, and timeline', 'type' => 'pre_deployment'],
        ];

        foreach (Institute::orderBy('id')->get() as $institute) {
            foreach ($commonRequirements as $req) {
                Requirement::updateOrCreate(
                    ['institute_id' => $institute->id, 'name' => $req['name']],
                    [
                        'description' => $req['description'],
                        'type' => $req['type'],
                        'is_active' => true,
                    ]
                );
            }
        }

        // ── Institute-Specific Requirements ─────────────────
        $instituteRequirements = [
            'Institute of Teacher Education (ITE)' => [
                ['name' => 'Teaching Portfolio', 'description' => 'Compiled portfolio of teaching demonstrations and lesson plans', 'type' => 'pre_deployment'],
                ['name' => 'Classroom Observation Report', 'description' => 'Pre-internship classroom observation clearance from cooperating teacher', 'type' => 'pre_deployment'],
                ['name' => 'Torch Certificate', 'description' => 'Certificate of completion of the Torch training program', 'type' => 'pre_deployment'],
                ['name' => 'Teaching Evaluation Form', 'description' => 'Evaluation form for the intern teaching performance', 'type' => 'post_deployment'],
            ],
            'Institute of Business and Financial Services (IBFS)' => [
                ['name' => 'Business Plan', 'description' => 'Individual business plan proposal for the internship period', 'type' => 'pre_deployment'],
                ['name' => 'NC II Certificate', 'description' => 'National Certificate II in Office Administration or related field (if applicable)', 'type' => 'pre_deployment'],
                ['name' => 'Financial Literacy Assessment', 'description' => 'Completed financial literacy self-assessment form', 'type' => 'pre_deployment'],
                ['name' => 'Accomplishment Report', 'description' => 'Final accomplishment report of internship activities', 'type' => 'post_deployment'],
            ],
            'Institute of Computer Studies (ICS)' => [
                ['name' => 'Programming Portfolio', 'description' => 'GitHub profile or portfolio of programming projects', 'type' => 'pre_deployment'],
                ['name' => 'Technical Skills Assessment', 'description' => 'Completed technical skills evaluation form', 'type' => 'pre_deployment'],
                ['name' => 'System Project Proposal', 'description' => 'Proposed system or project to be developed during internship', 'type' => 'pre_deployment'],
                ['name' => 'System Documentation', 'description' => 'Complete technical documentation of developed system', 'type' => 'post_deployment'],
            ],
            'Institute of Criminal Justice Education (ICJE)' => [
                ['name' => 'NBI Clearance', 'description' => 'Valid NBI clearance for field deployment', 'type' => 'pre_deployment'],
                ['name' => 'Physical Fitness Certificate', 'description' => 'Certificate of physical fitness from licensed physician', 'type' => 'pre_deployment'],
                ['name' => 'Police Clearance', 'description' => 'Local police clearance for deployment areas', 'type' => 'pre_deployment'],
                ['name' => 'Case Study Report', 'description' => 'Completed case study report on criminal justice topic', 'type' => 'post_deployment'],
            ],
            'Institute of Health Sciences (IHS)' => [
                ['name' => 'Vaccination Record', 'description' => 'Complete vaccination record (Hepatitis B, Flu, COVID-19)', 'type' => 'pre_deployment'],
                ['name' => 'Health Certificate', 'description' => 'Annual health certificate from licensed physician', 'type' => 'pre_deployment'],
                ['name' => 'CPR Certification', 'description' => 'Valid CPR/Basic Life Support certification', 'type' => 'pre_deployment'],
                ['name' => 'Clinical Case Presentation', 'description' => 'Completed clinical case presentation report', 'type' => 'post_deployment'],
            ],
            'Institute of Arts and Sciences (IAS)' => [
                ['name' => 'Writing Portfolio', 'description' => 'Collection of written works and research papers', 'type' => 'pre_deployment'],
                ['name' => 'Research Proposal', 'description' => 'Approved research proposal for internship thesis', 'type' => 'pre_deployment'],
                ['name' => 'Community Service Certificate', 'description' => 'Certificate of community service involvement', 'type' => 'pre_deployment'],
                ['name' => 'Research Paper', 'description' => 'Completed research paper or thesis', 'type' => 'post_deployment'],
            ],
        ];

        foreach ($instituteRequirements as $instituteName => $requirements) {
            $institute = Institute::where('name', $instituteName)->first();
            if (! $institute) {
                continue;
            }

            foreach ($requirements as $req) {
                Requirement::updateOrCreate(
                    ['institute_id' => $institute->id, 'name' => $req['name']],
                    [
                        'description' => $req['description'],
                        'type' => $req['type'],
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
