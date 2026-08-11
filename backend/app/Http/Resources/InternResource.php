<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class InternResource extends JsonResource
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
            'user_id' => $this->user_id,
            'academic_year_id' => $this->academic_year_id,
            'institute_id' => $this->institute_id,
            'program_id' => $this->program_id,
            'date_of_birth' => $this->date_of_birth,
            'place_of_birth' => $this->place_of_birth,
            'fathers_name' => $this->fathers_name,
            'fathers_occupation' => $this->fathers_occupation,
            'fathers_contact' => $this->fathers_contact,
            'mothers_name' => $this->mothers_name,
            'mothers_occupation' => $this->mothers_occupation,
            'mothers_contact' => $this->mothers_contact,
            'parents_guardian_address' => $this->parents_guardian_address,
            'practicum_instructor' => $this->practicum_instructor,
            'cor' => $this->cor_path ? Storage::disk('public')->url($this->cor_path) : null,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
