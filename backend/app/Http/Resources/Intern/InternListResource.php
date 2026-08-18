<?php

namespace App\Http\Resources\Intern;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InternListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->user->uuid,
            'full_name' => $this->user->full_name,
            'email' => $this->user->email,
            'contact_number' => $this->user->contact_number,
            'profile_picture' => $this->user->profile_picture,
            'institute' => $this->institute?->name,
            'program' => $this->program?->name,
            'academic_year' => $this->academicYear?->description,
            'status' => $this->status,
            'ojt_status' => $this->ojt_status,
            'start_date' => $this->start_date?->toDateString(),
            'journals_count' => $this->journals_count ?? 0,
            'journals_verified_count' => $this->journals_verified_count ?? 0,
            'journals_flagged_count' => $this->journals_flagged_count ?? 0,
            'journals_unchecked_count' => max(
                0,
                ($this->journals_count ?? 0) - ($this->journals_verified_count ?? 0) - ($this->journals_flagged_count ?? 0)
            ),
            'journals_approved_count' => $this->journals_approved_count ?? 0,
            'journals_rejected_count' => $this->journals_rejected_count ?? 0,
            'journals_pending_count' => $this->journals_pending_count ?? 0,
            'created_at' => $this->created_at,
        ];
    }
}
