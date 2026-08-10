<?php

namespace Database\Seeders;

use App\Models\Institute;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class InstituteSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $institutes = [
            [
                'name' => 'Institute of Teacher Education (ITE)',
                'description' => 'The Institute of Teacher Education (ITE) is dedicated to preparing future educators who can effectively teach in elementary and secondary schools. The institute emphasizes pedagogical excellence, educational leadership, communication skills, technological literacy, and community engagement. Its mission is to produce competent, ethical, and innovative teachers capable of responding to the changing needs of education in the Philippines and beyond.

Programs Offered:
- Bachelor of Elementary Education (BEED)
- Bachelor of Secondary Education Major in Mathematics (BSEd Math)
- Bachelor of Secondary Education Major in English (BSEd English)
- Bachelor of Secondary Education Major in Filipino (BSEd Filipino)
- Bachelor of Secondary Education Major in Social Studies (BSEd Social Studies)

Career Opportunities:
- Elementary Teachers
- Secondary School Teachers
- Curriculum Developers
- Educational Researchers
- School Administrators
- Learning Facilitators and Trainers',
            ],
            [
                'name' => 'Institute of Business and Financial Services (IBFS)',
                'description' => 'The Institute of Business and Financial Services (IBFS) develops future professionals in business administration, management, entrepreneurship, marketing, and office administration. The institute equips students with practical business skills, leadership abilities, and decision-making competencies necessary for modern organizations and enterprises.

Programs Offered:
- BS Business Administration Major in Human Resource Management (BSBA-HRM)
- BS Business Administration Major in Marketing Management (BSBA-MM)
- BS Office Administration (BSOA)

Career Opportunities:
- Human Resource Officers
- Marketing Specialists
- Administrative Officers
- Business Managers
- Entrepreneurs
- Corporate Supervisors',
            ],
            [
                'name' => 'Institute of Computer Studies (ICS)',
                'description' => 'The Institute of Computer Studies (ICS) focuses on computing, software development, and information technology. The institute aims to develop professionals capable of designing, developing, and managing computer-based systems that solve real-world problems. Students gain knowledge in programming, database management, networking, systems analysis, and emerging technologies.

Programs Offered:
- Bachelor of Science in Computer Science (BSCS)

Career Opportunities:
- Software Developers
- Web Developers
- Systems Analysts
- Database Administrators
- IT Specialists
- Network Administrators
- Data Analysts',
            ],
            [
                'name' => 'Institute of Criminal Justice Education (ICJE)',
                'description' => 'The Institute of Criminal Justice Education (ICJE) prepares students for careers in law enforcement, public safety, criminal investigation, and security management. The institute emphasizes discipline, ethical conduct, leadership, and professional competence required in maintaining peace and order.

Programs Offered:
- Bachelor of Science in Criminology (BSCrim)
- Bachelor of Science in Industrial Security Management (BSISM)

Career Opportunities:
- Police Officers
- Criminal Investigators
- Correctional Officers
- Forensic Specialists
- Security Managers
- Public Safety Officers',
            ],
            [
                'name' => 'Institute of Health Sciences (IHS)',
                'description' => 'The Institute of Health Sciences (IHS) focuses on healthcare education and community health services. The institute trains students to provide competent healthcare support while promoting wellness and public health awareness. Students develop clinical skills, professional ethics, and patient-centered care competencies.

Programs Offered:
- General Midwifery

Career Opportunities:
- Registered Midwives
- Community Health Workers
- Maternal and Child Health Practitioners
- Healthcare Assistants',
            ],
            [
                'name' => 'Institute of Arts and Sciences (IAS)',
                'description' => 'The Institute of Arts and Sciences (IAS) serves as the foundation of liberal arts, social sciences, humanities, and communication studies within the college. The institute promotes critical thinking, effective communication, social awareness, leadership, and civic responsibility. It develops graduates who are intellectually competent and socially engaged citizens.

Programs Offered:
- Bachelor of Arts in Political Science (AB Political Science)
- Bachelor of Arts in English (AB English)
- Bachelor of Arts in Communication (AB Communication)

Career Opportunities:
- Public Administrators
- Journalists
- Writers and Editors
- Communication Specialists
- Policy Analysts
- Researchers
- Public Relations Officers',
            ],
        ];

        foreach ($institutes as $institute) {
            Institute::updateOrCreate(
                ['name' => $institute['name']],
                [
                    'description' => $institute['description'],
                    'is_active' => true,
                ]
            );
        }
    }
}
