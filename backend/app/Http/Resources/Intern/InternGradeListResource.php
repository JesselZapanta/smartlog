<?php

namespace App\Http\Resources\Intern;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One row of the instructor's Intern Grade table.
 *
 * Carries `academic_year_id` so the grade dialog and the PATCH can target this
 * exact term rather than always writing to the intern's newest enrollment.
 */
class InternGradeListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $requiredHours = $this->requiredHours();
        $requiredMinutes = ($requiredHours ?? 0) * 60;
        $earnedMinutes = $this->earnedMinutes();

        return [
            'id' => $this->id,
            'uuid' => $this->user->uuid,
            'full_name' => $this->user->full_name,
            'email' => $this->user->email,
            'profile_picture' => $this->user->profile_picture,
            'program' => $this->program?->name,
            'academic_year_id' => $this->academic_year_id,
            'academic_year' => $this->academicYear?->description,
            'ojt_status' => $this->ojt_status,
            'grade' => $this->grade,
            'required_hours' => $requiredHours,
            'earned_minutes' => $earnedMinutes,
            'hours_met' => $requiredMinutes > 0 && $earnedMinutes >= $requiredMinutes,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
        ];
    }
}
