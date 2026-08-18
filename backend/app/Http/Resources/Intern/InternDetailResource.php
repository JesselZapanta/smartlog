<?php

namespace App\Http\Resources\Intern;

use App\Http\Resources\LocationResource;
use App\Support\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InternDetailResource extends JsonResource
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
            'practicum_instructor' => $this->practicum_instructor,
            'ojt_status' => $this->ojt_status,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'cor' => StorageUrl::url($this->cor_path),
            'date_of_birth' => $this->date_of_birth,
            'place_of_birth' => $this->place_of_birth,
            'fathers_name' => $this->fathers_name,
            'fathers_occupation' => $this->fathers_occupation,
            'fathers_contact' => $this->fathers_contact,
            'mothers_name' => $this->mothers_name,
            'mothers_occupation' => $this->mothers_occupation,
            'mothers_contact' => $this->mothers_contact,
            'parents_guardian_address' => $this->parents_guardian_address,
            'location' => $this->user->location ? new LocationResource($this->user->location) : null,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'reviewed_by' => $this->reviewer?->full_name,
            'reviewed_at' => $this->reviewed_at,
            'created_at' => $this->created_at,
        ];
    }
}
