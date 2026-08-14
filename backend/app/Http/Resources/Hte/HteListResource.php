<?php

namespace App\Http\Resources\Hte;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HteListResource extends JsonResource
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
            'name' => $this->name,
            'contact_person' => $this->user->full_name,
            'email' => $this->user->email,
            'contact_number' => $this->user->contact_number,
            'profile_picture' => $this->user->profile_picture,
            'institute_id' => $this->institute_id,
            'program_id' => $this->program_id,
            'institute' => $this->institute?->name,
            'program' => $this->program?->name,
            'status' => $this->status,
            'start_at' => $this->start_at?->format('Y-m-d'),
            'end_at' => $this->end_at?->format('Y-m-d'),
            'assigned_count' => $this->whenCounted('assignedInterns'),
            'created_at' => $this->created_at,
        ];
    }
}
