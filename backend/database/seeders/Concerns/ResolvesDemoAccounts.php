<?php

namespace Database\Seeders\Concerns;

use App\Models\AcademicTerm;
use App\Models\Hte;
use App\Models\Institute;
use App\Models\Intern;
use App\Models\User;

/**
 * The canonical demo-account conventions, shared by every seeder.
 *
 * UserSeeder creates the accounts and the placement, enrollment, submission and
 * evaluation seeders layer data onto them, so the email templates and the
 * lookups that resolve them live in one place instead of drifting apart.
 */
trait ResolvesDemoAccounts
{
    /**
     * Short code the demo emails are keyed on — `intern.ics.3@smartlog.test`.
     */
    protected function slugFor(Institute $institute): string
    {
        return match (true) {
            str_contains($institute->name, 'Teacher Education') => 'ite',
            str_contains($institute->name, 'Business') => 'ibfs',
            str_contains($institute->name, 'Computer Studies') => 'ics',
            str_contains($institute->name, 'Criminal Justice') => 'icje',
            str_contains($institute->name, 'Health Sciences') => 'ihs',
            default => 'ias',
        };
    }

    protected function coordinatorEmail(Institute $institute): string
    {
        $slug = $this->slugFor($institute);

        return $slug === 'ite' ? 'coordinator@smartlog.test' : "coordinator.{$slug}@smartlog.test";
    }

    protected function instructorEmail(Institute $institute): string
    {
        $slug = $this->slugFor($institute);

        return $slug === 'ite' ? 'instructor@smartlog.test' : "instructor.{$slug}@smartlog.test";
    }

    /**
     * Email of the intern at one position of an institute's roster (#1–#10).
     */
    protected function internEmail(Institute $institute, int $index): string
    {
        $slug = $this->slugFor($institute);

        return $slug === 'ite' && $index === 1
            ? 'intern@smartlog.test'
            : "intern.{$slug}.{$index}@smartlog.test";
    }

    /**
     * Email of an institute's HTE account; #1 is the demo login, #2 the partner
     * transfers move between.
     */
    protected function hteEmail(Institute $institute, int $index): string
    {
        $slug = $this->slugFor($institute);
        $prefix = $index === 1 ? 'hte' : "hte{$index}";

        return $slug === 'ite' ? "{$prefix}@smartlog.test" : "{$prefix}.{$slug}@smartlog.test";
    }

    protected function userByEmail(string $email): ?User
    {
        return User::where('email', $email)->first();
    }

    /**
     * The term the showcase data lives in.
     */
    protected function activeTerm(): ?AcademicTerm
    {
        return AcademicTerm::query()->where('status', 'active')->latest('start_at')->first();
    }

    protected function coordinatorFor(Institute $institute): ?User
    {
        return $this->userByEmail($this->coordinatorEmail($institute));
    }

    protected function instructorFor(Institute $institute): ?User
    {
        return $this->userByEmail($this->instructorEmail($institute));
    }

    protected function internFor(Institute $institute, int $index, AcademicTerm $term): ?Intern
    {
        $user = $this->userByEmail($this->internEmail($institute, $index));

        return $user === null ? null : Intern::query()
            ->where('user_id', $user->id)
            ->where('academic_year_id', $term->id)
            ->first();
    }

    protected function hteFor(Institute $institute, int $index): ?Hte
    {
        $user = $this->userByEmail($this->hteEmail($institute, $index));

        return $user === null ? null : Hte::where('user_id', $user->id)->first();
    }
}
